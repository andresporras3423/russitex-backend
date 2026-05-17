// ============================================================
//  routes/pagos.js  —  Prepara el checkout con Wompi
// ============================================================
const express  = require('express');
const router   = express.Router();
const wompi    = require('../services/wompi');
const pedidos  = require('../services/pedidos');   // tu lógica de BD


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
//     { productoId: "abc", nombre: "Camiseta M", cantidad: 2, precio: 45000 },
//     { productoId: "xyz", nombre: "Pantalón L", cantidad: 1, precio: 80000 }
//   ],
//   cliente: {
//     nombre: "Juan Pérez",
//     email: "juan@email.com",
//     telefono: "3001234567"
//   },
//   envio: {
//     ciudad: "Bogotá",
//     direccion: "Calle 123 #45-67",
//     departamento: "Cundinamarca"
//   }
// }
// ------------------------------------------------------------
router.post('/preparar', async (req, res) => {
  try {
    const { carrito, cliente, envio } = req.body;

    // Validación básica
    if (!carrito?.length || !cliente?.email || !envio?.direccion) {
      return res.status(400).json({
        error: 'Faltan datos: carrito, cliente o dirección de envío'
      });
    }

    // 1. Calcular el total del carrito (en pesos)
    const totalPesos = carrito.reduce((suma, item) => {
      return suma + (item.precio * item.cantidad);
    }, 0);

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

    res.json({
      referencia: pedido.referencia,
      estado:     pedido.estado,        // PENDIENTE | APROBADO | RECHAZADO
      total:      pedido.totalPesos,
      cliente:    pedido.cliente.nombre
    });

  } catch (error) {
    console.error('Error consultando estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


module.exports = router;
