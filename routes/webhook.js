// ============================================================
//  routes/webhook.js  —  Wompi avisa aquí cuando hay un pago
// ============================================================
const express = require('express');
const router  = express.Router();
const wompi   = require('../services/wompi');
const pedidos = require('../services/pedidos');
const envios  = require('../services/envios');
const alegra  = require('../services/alegra');


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

  // Evitar procesar el mismo pago dos veces
  if (pedido.estado === 'APROBADO') {
    console.log(`ℹ️  Pedido ${referencia} ya fue procesado, ignorando duplicado`);
    return;
  }

  // 2. Actualizar estado del pedido en tu BD
  await pedidos.actualizarEstado(referencia, 'APROBADO', {
    transaccionId,
    metodoPago: transaccion.payment_method_type,  // CARD, NEQUI, PSE, etc.
    fechaPago: new Date().toISOString()
  });

  console.log(`✅ Pago aprobado para pedido ${referencia}`);

  // 3. Descontar stock de los productos vendidos
  await pedidos.descontarStock(pedido.carrito);

  // 4. Solicitar el envío automáticamente a MiPaquete
  //    El repartidor se agenda solo para recoger en tu dirección
  await envios.solicitarRecoleccion({
    referencia,
    cliente:  pedido.cliente,
    envio:    pedido.envio,
    carrito:  pedido.carrito
  });

  // 5. Generar factura electrónica en Alegra
  await alegra.generarFactura({
    referencia,
    cliente:    pedido.cliente,
    carrito:    pedido.carrito,
    totalPesos: pedido.totalPesos,
    metodoPago: transaccion.payment_method_type
  });

  console.log(`🧾 Factura generada y envío solicitado para pedido ${referencia}`);
}


module.exports = router;
