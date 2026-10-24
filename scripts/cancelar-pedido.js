// ============================================================
//  scripts/cancelar-pedido.js  —  La tienda cancela un pedido YA PAGADO
//
//  Lo mismo que el botón "Cancelar pedido" del panel de administrador
//  (/admin -> Pedidos), para usarlo desde la consola.
//
//  Uso:
//    node scripts/cancelar-pedido.js <referencia> "<motivo>" [--agotado "Forro Brioni"]...
//        El motivo se le muestra al cliente tal cual: escríbelo como frase, p. ej.
//        "el Forro Brioni se agotó justo después de tu compra y no alcanzamos a reservarlo."
//
//    node scripts/cancelar-pedido.js <referencia> --reembolsado
//        Marca que el reembolso ya se hizo (la página pasa a "Reembolsado").
// ============================================================
require('dotenv').config({ quiet: true })
const { cancelarPedido, marcarReembolsado } = require('../services/cancelaciones')

async function main() {
  const [referencia, ...resto] = process.argv.slice(2)
  if (!referencia || !resto.length) {
    console.error('Uso: node scripts/cancelar-pedido.js <referencia> "<motivo>" [--agotado "Producto"]...')
    console.error('     node scripts/cancelar-pedido.js <referencia> --reembolsado')
    process.exit(1)
  }

  if (resto[0] === '--reembolsado') {
    await marcarReembolsado(referencia)
    console.log(`✅ ${referencia}: reembolso marcado como hecho.`)
    return
  }

  const agotados = []
  for (let i = 1; i < resto.length; i++) if (resto[i] === '--agotado' && resto[i + 1]) agotados.push(resto[++i])

  const r = await cancelarPedido(referencia, { motivo: resto[0], agotados })
  if (r.guia?.ok) console.log(`🚚 Guía cancelada en Envia${r.guia.devuelto != null ? ` (devolvió $${r.guia.devuelto})` : ''}.`)
  console.log(`❌ ${referencia} cancelado.${r.correo ? ' Se le avisó al cliente por correo.' : ''}`)
  console.log('\nFALTA A MANO:')
  for (const p of r.pendientes) console.log(`  - ${p}`)
  console.log(`  - Cuando el dinero se haya devuelto: node scripts/cancelar-pedido.js ${referencia} --reembolsado`)
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
