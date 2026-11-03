// ============================================================
//  scripts/facturar-mercadolibre.js  —  Factura ventas de Mercado Libre a mano
//
//  Uso:  node scripts/facturar-mercadolibre.js <orden>    una venta
//        node scripts/facturar-mercadolibre.js recientes  las pagadas de los
//                                                         últimos 7 días sin factura
//
//  Igual que la notificación automática: una factura por compra y una sola
//  vez. Respeta ALEGRA_EMITIR (sin "true" queda en borrador y no se sube).
// ============================================================
require('dotenv').config({ quiet: true })
const { facturarVenta, revisarRecientes } = require('../services/ventasMercadoLibre')

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Uso: node scripts/facturar-mercadolibre.js <orden> | recientes')
    process.exit(1)
  }
  console.log(`Modo: ${process.env.ALEGRA_EMITIR === 'true' ? 'EMITIR a la DIAN' : 'borrador'}`)
  const r = arg === 'recientes' ? await revisarRecientes() : await facturarVenta(arg)
  console.log(JSON.stringify(r, null, 2))
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
