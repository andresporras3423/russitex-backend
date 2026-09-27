// ============================================================
//  routes/webhook.js  —  Wompi avisa aquí cuando hay un pago
// ============================================================
const crypto  = require('crypto');
const express = require('express');
const router  = express.Router();
const wompi   = require('../services/wompi');
const pedidos = require('../services/pedidos');
const envios  = require('../services/envios');
const alegra  = require('../services/alegra');
const notificaciones = require('../services/notificaciones');


// ------------------------------------------------------------
// POST /api/webhook/wompi
//
// Wompi llama este endpoint automáticamente cada vez que
// una transacción cambia de estado (aprobada, rechazada, etc.)
//
// IMPORTANTE: esta URL debe ser pública (no localhost).
// En desarrollo puedes usar ngrok para exponerla temporalmente.
// En producción es simplemente https://tutienda.com/api/webhook/wompi
// ------------------------------------------------------------
router.post('/wompi', async (req, res) => {
  try {
    const evento    = req.body;
    const firma     = req.headers['x-event-checksum'];  // Wompi envía la firma aquí

    // --------------------------------------------------------
    // PASO 1: Verificar que el webhook viene de Wompi de verdad
    //         Si alguien intenta hacerse pasar por Wompi,
    //         la firma no va a coincidir y lo rechazamos.
    // --------------------------------------------------------
    if (!wompi.verificarFirmaWebhook(evento, firma)) {
      console.warn('⚠️  Webhook con firma inválida - posible intento de fraude');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    // Solo nos interesan los cambios de estado de transacciones.
    if (evento.event !== 'transaction.updated') {
      console.log(`ℹ️  Evento ignorado: ${evento.event}`);
      return res.status(200).json({ recibido: true });
    }

    const transaccion = evento.data.transaction;
    const { reference, status, id: transaccionId } = transaccion;

    console.log(`📦 Webhook recibido | Referencia: ${reference} | Estado: ${status}`);

    // --------------------------------------------------------
    // PASO 2: Actuar según el estado de la transacción
    // --------------------------------------------------------
    switch (status) {

      case 'APPROVED':
        await manejarPagoAprobado(reference, transaccionId, transaccion);
        break;

      case 'DECLINED':
        await pedidos.actualizarEstado(reference, 'RECHAZADO');
        console.log(`❌ Pago rechazado para pedido ${reference}`);
        break;

      case 'VOIDED':
        await pedidos.actualizarEstado(reference, 'ANULADO');
        console.log(`🚫 Pago anulado para pedido ${reference}`);
        break;

      case 'ERROR':
        await pedidos.actualizarEstado(reference, 'ERROR');
        console.log(`⛔ Error en pago para pedido ${reference}`);
        break;

      default:
        // Estados intermedios como PENDING — no hacemos nada todavía
        console.log(`ℹ️  Estado intermedio: ${status} para ${reference}`);
    }

    // Wompi espera un 200 para saber que recibiste el webhook.
    // Si no responde 200, Wompi reintenta el webhook varias veces.
    res.status(200).json({ recibido: true });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    // Devolvemos 500 para que Wompi reintente el webhook
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});


// ------------------------------------------------------------
// Lógica cuando el pago es aprobado
// Aquí encadenas todo: actualizar pedido → envío → factura
// ------------------------------------------------------------
async function manejarPagoAprobado(referencia, transaccionId, transaccion) {
  // 1. Buscar el pedido en tu BD
  const pedido = await pedidos.buscarPorReferencia(referencia);

  if (!pedido) {
    throw new Error(`Pedido no encontrado para referencia: ${referencia}`);
  }

  // 2. Actualizar estado del pedido en tu BD.
  //    Puede que ya esté APROBADO: /api/pagos/verificar lo marca cuando el
  //    cliente vuelve de Wompi, muchas veces antes de que llegue este aviso.
  if (pedido.estado !== 'APROBADO') {
    await pedidos.actualizarEstado(referencia, 'APROBADO', {
      transaccionId,
      metodoPago: transaccion.payment_method_type,  // CARD, NEQUI, PSE, etc.
      fechaPago: new Date().toISOString()
    });
  }

  console.log(`✅ Pago aprobado para pedido ${referencia}`);

  // Evitar disparar la logística dos veces (Wompi reintenta los avisos).
  // No se usa el estado para esto porque verificar ya pudo ponerlo APROBADO.
  if (!(await pedidos.reservarLogistica(referencia))) {
    console.log(`ℹ️  Logística de ${referencia} ya procesada, ignorando duplicado`);
    return;
  }

  try {
    // 3. Descontar stock de los productos vendidos
    await pedidos.descontarStock(pedido.carrito);

    // 4. Crear la guía en Envia y guardarla en el pedido. Si ya tiene guía
    //    (un reintento después de que falló un paso posterior), no se crea
    //    otra: cada guía real cuesta.
    if (!pedido.guia) {
      const guia = await envios.crearEnvio({
        referencia,
        cliente:  pedido.cliente,
        envio:    pedido.envio,
        carrito:  pedido.carrito
      });
      if (guia) {
        await pedidos.guardarGuia(referencia, guia);
        pedido.guia = guia;   // para el correo de confirmación
      }
    }

    // 5. Generar factura electrónica en Alegra
    await alegra.generarFactura({
      referencia,
      cliente:    pedido.cliente,
      carrito:    pedido.carrito,
      totalPesos: pedido.totalPesos,
      metodoPago: transaccion.payment_method_type
    });
  } catch (error) {
    // Soltamos la reserva para que el reintento de Wompi lo vuelva a intentar.
    await pedidos.liberarLogistica(referencia);
    throw error;
  }

  console.log(`🧾 Factura generada y envío solicitado para pedido ${referencia}`);

  // 6. Correo de confirmación al cliente (con la guía si ya existe). Va al
  //    final y fuera del try: solo sale cuando todo lo anterior funcionó, una
  //    sola vez, y si el correo falla no se reintenta la logística.
  //    No se espera: Wompi necesita su 200 rápido y un correo lento haría
  //    que reintente el aviso. (avisarPedidoAprobado nunca lanza error.)
  notificaciones.avisarPedidoAprobado(pedido);
}


// ------------------------------------------------------------
// POST /api/webhook/envia
//
// Envia llama aquí cuando cambia el estado de un envío (webhook de tipo
// "tracking.simple", registrado en shipping.envia.com/settings/developers).
//
// No se confía en el estado que trae el aviso: en producción se le
// pregunta a Envia con nuestra llave. Así un aviso falso, como mucho,
// hace que se refresque el estado. (Las guías de PRUEBAS nunca cambian de
// estado en el sandbox, así que para ellas se usa el del aviso y se puede
// probar con la herramienta "webhooktest" de Envia.)
//
// Firma: si ENVIA_WEBHOOK_SECRET está definido (el "Secreto de firma" del
// webhook en el panel de Envia) y el aviso trae X-Webhook-Signature, se
// verifica y se rechaza si no coincide. Los avisos sin firma (el botón
// "Probar" y la herramienta webhooktest de Envia no firman) se aceptan,
// porque en producción el estado igual se le pregunta a Envia.
// ------------------------------------------------------------

// Envia valida la URL con "Probar" sin mandar un aviso: basta un 200.
router.get('/envia', (req, res) => res.status(200).json({ ok: true }));

// v1=HMAC-SHA256(timestamp + "." + evento + "." + cuerpo, secreto), en hex.
function firmaEnviaValida(req) {
  const secreto = process.env.ENVIA_WEBHOOK_SECRET;
  const firma = req.headers['x-webhook-signature'];
  if (!secreto || !firma) return true;   // sin secreto o sin firma: ver arriba

  const ts = req.headers['x-webhook-timestamp'] || '';
  const evento = req.headers['x-webhook-event'] || '';
  const cuerpo = req.cuerpoCrudo ? req.cuerpoCrudo.toString('utf8') : JSON.stringify(req.body);
  const esperada = crypto.createHmac('sha256', secreto).update(`${ts}.${evento}.${cuerpo}`).digest('hex');

  const recibida = String(firma).replace(/^v1=/, '').toLowerCase();
  const a = Buffer.from(esperada);
  const b = Buffer.from(recibida);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post('/envia', (req, res) => {
  if (!firmaEnviaValida(req)) {
    console.warn('⚠️  [envia] Aviso con firma inválida, rechazado');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  // Envia pide responder rápido; el trabajo se hace después.
  res.status(200).json({ recibido: true });
  procesarAvisoEnvia(req.body).catch((e) => console.error('[envia] Error procesando aviso:', e.message));
});

async function procesarAvisoEnvia(aviso) {
  const datos = aviso?.data || aviso || {};
  const numeroGuia = datos.tracking_number || datos.trackingNumber;
  if (!numeroGuia) {
    console.warn('[envia] Aviso sin número de guía:', JSON.stringify(aviso).slice(0, 300));
    return;
  }

  const pedido = await pedidos.buscarPorGuia(numeroGuia);
  if (!pedido) {
    console.log(`[envia] Guía ${numeroGuia} no corresponde a ningún pedido; se ignora.`);
    return;
  }

  const guia = pedido.guia;
  const estado = guia.ambiente === 'produccion'
    ? await envios.consultarRastreo('produccion', numeroGuia)
    : (datos.status || await envios.consultarRastreo('pruebas', numeroGuia));
  if (!estado) return;

  const categoria = envios.categoriaDeEstado(estado);
  console.log(`🚚 [envia] ${pedido.referencia} · guía ${numeroGuia}: ${estado} (${categoria || 'sin aviso'})`);

  // El estado se guarda primero: si el correo tarda o falla, el pedido ya
  // queda al día.
  const guiaActual = { ...guia, estado, estadoActualizadoEn: new Date().toISOString() };
  await pedidos.guardarGuia(pedido.referencia, guiaActual);

  // Cada aviso se manda una sola vez aunque Envia repita el estado.
  const avisos = new Set(guia.avisos || []);
  let enviado = false;
  if (categoria === 'novedad') {
    const clave = `novedad:${estado}`;
    if (!avisos.has(clave) && await notificaciones.avisarNovedadAlmacen(pedido, estado)) { avisos.add(clave); enviado = true; }
  } else if (categoria && !avisos.has(categoria)) {
    if (await notificaciones.avisarEstadoEnvio(pedido, categoria)) { avisos.add(categoria); enviado = true; }
  }
  if (enviado) await pedidos.guardarGuia(pedido.referencia, { ...guiaActual, avisos: [...avisos] });
}


module.exports = router;
