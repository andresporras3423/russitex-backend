// ============================================================
//  services/facturacion.js  —  Factura de un pedido aprobado
//
//  Lo usan el webhook de Wompi (al aprobarse el pago) y el script
//  scripts/facturar-pedido.js (para reintentar a mano si Alegra falló).
// ============================================================
const alegra = require('./alegra')
const pedidos = require('./pedidos')

// Factura el pedido una sola vez: si ya tiene factura no hace nada.
// Devuelve la factura (nueva o la que ya tenía).
async function facturarPedido(pedido) {
  if (pedido.factura) return pedido.factura
  const factura = await alegra.generarFactura(pedido)
  await pedidos.guardarFactura(pedido.referencia, factura)
  pedido.factura = factura
  return factura
}

module.exports = { facturarPedido }
