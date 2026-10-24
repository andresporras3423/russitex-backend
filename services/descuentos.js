// ============================================================
//  services/descuentos.js  —  Descuento por compras grandes
//
//  DESCUENTO_COMPRA_PORCENTAJE % (5 por defecto) sobre los PRODUCTOS cuando
//  su subtotal llega al monto de tienda_info "descuento_compra_desde"
//  (p. ej. "Compras desde $350.000 COP"). El envío nunca tiene descuento:
//  lo paga el cliente completo.
//
//  Se calcula línea por línea y se redondea al peso, igual que lo hace la
//  factura de Alegra (descuento % por ítem), para que los totales coincidan.
// ============================================================
const { umbralDescuento } = require('./tienda')

const porcentaje = () => Number(process.env.DESCUENTO_COMPRA_PORCENTAJE ?? 5)

// Devuelve { porcentaje, monto, desde } (monto 0 si no aplica).
async function calcularDescuento(carrito) {
  const desde = await umbralDescuento().catch(() => null)
  const subtotal = (carrito || []).reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0)
  const p = porcentaje()
  if (!desde || !(p > 0) || subtotal < desde) return { porcentaje: 0, monto: 0, desde }
  const monto = (carrito || []).reduce((s, i) => s + Math.round((Number(i.precio) * Number(i.cantidad) * p) / 100), 0)
  return { porcentaje: p, monto, desde }
}

module.exports = { calcularDescuento }
