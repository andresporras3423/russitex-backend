// ============================================================
//  routes/pagos.js  —  Prepara el checkout con Wompi
// ============================================================
const express  = require('express');
const router   = express.Router();
const wompi    = require('../services/wompi');
const pedidos  = require('../services/pedidos');   // tu lógica de BD
const envios   = require('../services/envios');
const { obtenerCatalogo } = require('../services/catalogo');

const MAX_CANTIDAD = 9999;

// ------------------------------------------------------------
// El carrito que se cobra lo arma el SERVIDOR: del navegador solo se toma
// qué producto, qué color y cuántos. Nombre y precio salen del catálogo
// (Alegra), así que cambiarlos con "Inspeccionar" no sirve de nada.
// Devuelve { carrito } o { error }.
// ------------------------------------------------------------
async function armarCarrito(carritoCliente) {
  const { productos } = await obtenerCatalogo();
  const porId = new Map(productos.map((p) => [String(p.id), p]));
  const carrito = [];

  for (const linea of carritoCliente) {
    const p = porId.get(String(linea?.productoId));
    if (!p) return { error: 'Un producto de tu carrito ya no está en el catálogo. Revisa tu carrito.' };

    const cantidad = Number(linea.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      return { error: `La cantidad de "${p.nombre}" no es válida.` };
    }

    // El color tiene que ser uno de los del producto (o ninguno si no tiene).
    let variante = null;
    if (p.variantes?.length) {
      const v = p.variantes.find((x) => x.nombre === linea.variante);
      if (!v) return { error: `Elige el color de "${p.nombre}" en tu carrito.` };
      if (!v.disponible) return { error: `"${p.nombre}" en ${v.nombre} está agotado. Revisa tu carrito.` };
      variante = v.nombre;
    } else if (!p.disponible) {
      return { error: `"${p.nombre}" está agotado. Revisa tu carrito.` };
    }

    if (!(p.precio > 0)) return { error: `"${p.nombre}" no tiene precio. Escríbenos por WhatsApp.` };
    carrito.push({ productoId: String(p.id), nombre: p.nombre, precio: p.precio, cantidad, variante });
  }
  return { carrito };
}


// ------------------------------------------------------------
// POST /api/pagos/preparar
//
// El frontend llama esto cuando el usuario hace clic en "Pagar".
// Recibe el carrito, calcula el total, genera la firma,
// y devuelve todo lo que el frontend necesita para mostrar
// el widget de Wompi.
//
// Body esperado:
// {
//   carrito: [
//     { productoId: "4", cantidad: 2, variante: "Negro" },   // variante: solo si tiene colores
//     { productoId: "18", cantidad: 1 }                         // nombre y precio los pone el servidor
//   ],
//   cliente: {
//     nombre: "Juan Pérez",
//     email: "juan@email.com",
//     telefono: "3001234567"
//   },
//   envio: {
//     modalidad: "domicilio",          // o "tienda" (recoge en el local)
//     ciudad: "Bogotá",
//     direccion: "Calle 123 #45-67",   // solo para domicilio
//     departamento: "Cundinamarca",
//     codigoDane: "11001000"           // solo para domicilio
//   }
// }
// ------------------------------------------------------------
router.post('/preparar', async (req, res) => {
  try {
    const { cliente } = req.body;
    let envio = req.body.envio || {};

    if (!Array.isArray(req.body.carrito) || !req.body.carrito.length || req.body.carrito.length > 100) {
      return res.status(400).json({ error: 'Tu carrito está vacío.' });
    }
    const { carrito, error: errorCarrito } = await armarCarrito(req.body.carrito);
    if (errorCarrito) return res.status(409).json({ error: errorCarrito });

    // Sin "modalidad" (checkout viejo en caché) se deduce del costo enviado.
    const domicilio = envio.modalidad
      ? envio.modalidad === 'domicilio'
      : Number(envio.costo) > 0;

    // Validación básica
    if (!carrito?.length || !cliente?.email || (domicilio && (!envio.direccion || !envio.codigoDane))) {
      return res.status(400).json({
        error: 'Faltan datos: carrito, cliente o dirección de envío'
      });
    }

    // 1. Calcular el total: productos + envío (en pesos)
    const totalProductos = carrito.reduce((suma, item) => {
      return suma + (item.precio * item.cantidad);
    }, 0);

    // El envío se vuelve a cotizar ACÁ: no se confía en el costo que manda el
    // navegador. La cotización del checkout queda guardada unos minutos, así
    // que normalmente es la misma y responde al instante.
    let costoEnvio = 0;
    if (domicilio) {
      const { lineas } = await envios.resolverCarrito(carrito);
      const { cotizacion, aviso } = await envios.cotizarEnvio({
        carrito: lineas,
        destino: { codigoDane: envio.codigoDane, valorDeclarado: totalProductos },
      });
      if (!cotizacion) {
        return res.status(422).json({ error: aviso || 'No se pudo calcular el envío para esa ciudad.' });
      }
      costoEnvio = Math.round(cotizacion.costoTotal);   // Wompi va en centavos enteros
      envio = {
        ...envio,
        modalidad: 'domicilio',
        costo: costoEnvio,                          // lo que paga el cliente
        envioGratis: Boolean(cotizacion.envioGratis),
        costoReal: Math.round(cotizacion.costoReal ?? cotizacion.costoTotal),   // lo que cuesta la guía
        transportadora: cotizacion.transportadora,
        carrier: cotizacion.carrier,
        servicio: cotizacion.servicio,
      };
    } else {
      envio = { ...envio, modalidad: 'tienda', costo: 0, codigoDane: null, transportadora: null };
    }
    const totalPesos = totalProductos + costoEnvio;

    // Wompi trabaja en CENTAVOS, así que multiplicamos por 100
    const totalCentavos = totalPesos * 100;

    // 2. Generar referencia única para este pedido
    const referencia = wompi.generarReferencia();

    // 3. Generar la firma de integridad (Wompi la exige)
    const firma = wompi.generarFirma(referencia, totalCentavos);

    // 4. Guardar el pedido en tu BD con estado "pendiente"
    //    Así cuando llegue el webhook ya tienes el pedido registrado
    await pedidos.crearPendiente({
      referencia,
      carrito,
      cliente,
      envio,
      totalPesos,
      estado: 'PENDIENTE'
    });

    // 5. Devolver al frontend todo lo que necesita para Wompi
    res.json({
      // Datos para el widget de Wompi
      publicKey:      process.env.WOMPI_PUBLIC_KEY,
      referencia,
      montoCentavos:  totalCentavos,
      moneda:         'COP',
      firma,
      // Datos del cliente (Wompi los usa para prellenar el formulario)
      email:          cliente.email,
      telefono:       cliente.telefono,
      nombre:         cliente.nombre,
      // URL a donde Wompi redirige después del pago
      redirectUrl:    `${process.env.FRONTEND_URL}/confirmacion`,
      // Resumen para mostrar al usuario
      resumen: {
        totalPesos,
        cantidadProductos: carrito.reduce((sum, i) => sum + i.cantidad, 0)
      }
    });

  } catch (error) {
    console.error('Error preparando pago:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ------------------------------------------------------------
// GET /api/pagos/estado/:referencia
//
// El frontend puede consultar el estado de un pago.
// Útil para la página de confirmación, en caso de que
// el webhook llegue antes de que el usuario sea redirigido.
// ------------------------------------------------------------
router.get('/estado/:referencia', async (req, res) => {
  try {
    const pedido = await pedidos.buscarPorReferencia(req.params.referencia);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json(pedidos.resumenPublico(pedido));

  } catch (error) {
    console.error('Error consultando estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ------------------------------------------------------------
// GET /api/pagos/verificar/:transaccionId
//
// Se llama desde la página de confirmación cuando el cliente vuelve de
// Wompi (Wompi agrega ?id=<transaccionId> a la redirect-url). Le pregunta
// DIRECTAMENTE a Wompi el estado real de la transacción y actualiza el
// pedido, sin depender de que haya llegado el webhook.
//
// OJO: NO dispara la logística post-pago (envío/factura). Esa vive en el
// webhook para no ejecutarla dos veces. Acá solo se confirma el estado.
// ------------------------------------------------------------
const ESTADO_WOMPI = {
  APPROVED: 'APROBADO',
  DECLINED: 'RECHAZADO',
  VOIDED:   'ANULADO',
  ERROR:    'ERROR',
};

router.get('/verificar/:transaccionId', async (req, res) => {
  try {
    const resp = await wompi.consultarTransaccion(req.params.transaccionId);
    const tx = resp?.data;
    if (!tx?.reference) {
      return res.status(404).json({ error: 'Transacción no encontrada en Wompi' });
    }

    const nuevoEstado = ESTADO_WOMPI[tx.status] || 'PENDIENTE';
    const pedido = await pedidos.buscarPorReferencia(tx.reference);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado', referencia: tx.reference });
    }

    // Se actualiza solo si cambia algo (evita repisar un pedido ya APROBADO).
    if (nuevoEstado !== 'PENDIENTE' && pedido.estado !== nuevoEstado) {
      const datosPago = nuevoEstado === 'APROBADO'
        ? { transaccionId: tx.id, metodoPago: tx.payment_method_type, fechaPago: new Date().toISOString() }
        : {};
      await pedidos.actualizarEstado(tx.reference, nuevoEstado, datosPago);
    }

    res.json(pedidos.resumenPublico(pedido, { estado: nuevoEstado, metodoPago: tx.payment_method_type }));
  } catch (error) {
    console.error('Error verificando transacción:', error.message);
    res.status(500).json({ error: 'No se pudo verificar el pago' });
  }
});


module.exports = router;
module.exports.armarCarrito = armarCarrito;   // para probarlo sin pasar por Wompi
