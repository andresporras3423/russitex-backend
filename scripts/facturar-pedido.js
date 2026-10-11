// ============================================================
//  scripts/facturar-pedido.js  —  Crea (o reintenta) la factura de un pedido
//
//  Uso:  node scripts/facturar-pedido.js <referencia>
//
//  Solo factura pedidos APROBADOS y una sola vez: si el pedido ya tiene
//  factura, la muestra y no crea otra. Respeta ALEGRA_EMITIR igual que el
//  webhook (sin "true" queda en borrador).
// ============================================================
require('dotenv').config({ quiet: true })
const pedidos = require('../services/pedidos')
const { facturarPedido } = require('../services/facturacion')

async function main() {
  const referencia = process.argv[2]
  if (!referencia) {
    console.error('Uso: node scripts/facturar-pedido.js <referencia>')
    process.exit(1)
  }

  const pedido = await pedidos.buscarPorReferencia(referencia)
  if (!pedido) throw new Error(`No existe el pedido ${referencia}`)
  if (pedido.estado !== 'APROBADO') throw new Error(`El pedido ${referencia} está ${pedido.estado}, no APROBADO`)
  if (pedido.factura) {
    console.log('Ya tenía factura, no se crea otra:', pedido.factura)
    return
  }

  console.log(`Modo: ${process.env.ALEGRA_EMITIR === 'true' ? 'EMITIR a la DIAN' : 'borrador'}`)
  const factura = await facturarPedido(pedido)
  console.log('Factura creada:', factura)
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
