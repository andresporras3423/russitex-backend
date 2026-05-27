// ============================================================
//  services/pedidos.js  —  Gestión de pedidos en tu BD
//
//  Por ahora usamos un Map en memoria para simular la BD.
//  Cuando tengas MongoDB, PostgreSQL, etc., solo reemplazas
//  las funciones internas sin tocar el resto del código.
// ============================================================

// Simulación de base de datos en memoria
// Reemplazar por tu BD real (MongoDB, PostgreSQL, Firebase, etc.)
const db = new Map();


// ------------------------------------------------------------
// Crear pedido con estado PENDIENTE
// Se llama antes de mostrar el widget de Wompi al usuario
// ------------------------------------------------------------
async function crearPendiente({ referencia, carrito, cliente, envio, totalPesos }) {
  const pedido = {
    referencia,
    carrito,
    cliente,
    envio,
    totalPesos,
    estado: 'PENDIENTE',
    creadoEn: new Date().toISOString(),
    transaccionId: null,
    metodoPago: null,
    fechaPago: null
  };

  db.set(referencia, pedido);
  console.log(`📝 Pedido creado: ${referencia} | Total: $${totalPesos.toLocaleString('es-CO')}`);
  return pedido;
}


// ------------------------------------------------------------
// Actualizar estado de un pedido
// Se llama desde el webhook cuando Wompi confirma el pago
 // ------------------------------------------------------------
async function actualizarEstado(referencia, nuevoEstado, datosPago = {}) {
  const pedido = db.get(referencia);

  if (!pedido) {
    throw new Error(`Pedido ${referencia} no existe en la BD`);
  }

  Object.assign(pedido, {
    estado: nuevoEstado,
    ...datosPago,
    actualizadoEn: new Date().toISOString()
  });

  db.set(referencia, pedido);
  return pedido;
}


// ------------------------------------------------------------
// Buscar pedido por referencia
// ------------------------------------------------------------
async function buscarPorReferencia(referencia) {
  return db.get(referencia) || null;
}


// ------------------------------------------------------------
// Descontar stock de los productos vendidos
//
// Aquí debes conectar con tu tabla/colección de productos.
// Por ahora logueamos lo que habría que descontar.
// ------------------------------------------------------------
async function descontarStock(carrito) {
  for (const item of carrito) {
    // TODO: conectar con tu BD de productos
    // await Producto.decrementarStock(item.productoId, item.cantidad)
    console.log(`📦 Stock descontado: ${item.cantidad}x "${item.nombre}" (ID: ${item.productoId})`);
  }
}


// ------------------------------------------------------------
// Listar todos los pedidos (útil para tu panel de admin)
// ------------------------------------------------------------
async function listarTodos() {
  return Array.from(db.values()).sort((a, b) =>
    new Date(b.creadoEn) - new Date(a.creadoEn)
  );
}


module.exports = {
  crearPendiente,
  actualizarEstado,
  buscarPorReferencia,
  descontarStock,
  listarTodos
};
