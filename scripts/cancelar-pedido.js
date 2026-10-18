// ============================================================
//  scripts/cancelar-pedido.js  —  La tienda cancela un pedido YA PAGADO
//
//  Uso:
//    node scripts/cancelar-pedido.js <referencia> "<motivo>" [--agotado "Forro Brioni"]...
//        Cancela el pedido: anula la guía de Envia (si la transportadora no lo
//        ha recogido), guarda la cancelación y le escribe al cliente con el
//        enlace a russitex.com/pedido-cancelado. El motivo se le muestra al
//        cliente tal cual: escríbelo como frase, p. ej.
//        "el Forro Brioni se agotó justo después de tu compra y no alcanzamos a reservarlo."
//
//    node scripts/cancelar-pedido.js <referencia> --reembolsado
//        Marca que el reembolso ya se hizo (la página pasa a "Reembolsado").
//
//  El DINERO no lo devuelve este script: se hace en el panel de Wompi
//  (Transacciones -> buscar la referencia -> Anular/Reembolsar). Al final se
//  recuerda también qué hacer con la factura de Alegra.
// ============================================================
require('dotenv').config({ quiet: true })
const pedidos = require('../services/pedidos')
const envios = require('../services/envios')
const notificaciones = require('../services/notificaciones')

async function main() {
  const [referencia, ...resto] = process.argv.slice(2)
  if (!referencia || !resto.length) {
    console.error('Uso: node scripts/cancelar-pedido.js <referencia> "<motivo>" [--agotado "Producto"]...')
    console.error('     node scripts/cancelar-pedido.js <referencia> --reembolsado')
    process.exit(1)
  }

  const pedido = await pedidos.buscarPorReferencia(referencia)
  if (!pedido) throw new Error(`No existe el pedido ${referencia}`)

  if (resto[0] === '--reembolsado') {
    if (!pedido.cancelacion) throw new Error(`${referencia} no está cancelado`)
    await pedidos.guardarCancelacion(referencia, {
      ...pedido.cancelacion, estadoReembolso: 'reembolsado', reembolsadoEn: new Date().toISOString(),
    })
    console.log(`✅ ${referencia}: reembolso marcado como hecho.`)
    return
  }

  if (pedido.estado !== 'APROBADO') throw new Error(`${referencia} está ${pedido.estado}: solo se cancelan pedidos pagados`)
  if (pedido.cancelacion) throw new Error(`${referencia} ya estaba cancelado (${pedido.cancelacion.canceladoEn})`)

  const motivo = resto[0]
  const agotados = []
  for (let i = 1; i < resto.length; i++) if (resto[i] === '--agotado' && resto[i + 1]) agotados.push(resto[++i])

  // 1. Guía de Envia
  let guiaCancelada = null
  if (pedido.guia?.numeroGuia) {
    const r = await envios.cancelarEnvio(pedido.guia)
    guiaCancelada = r.ok
    console.log(r.ok
      ? `🚚 Guía ${pedido.guia.numeroGuia} cancelada en Envia${r.devuelto != null ? ` (devolvió $${r.devuelto})` : ''}.`
      : `⚠️  No se pudo cancelar la guía ${pedido.guia.numeroGuia}: ${r.detalle}. Si la transportadora ya recogió el paquete, gestiónalo con Envia.`)
  }

  // 2. Cancelación en el pedido
  const cancelacion = {
    motivo, agotados, monto: pedido.totalPesos, estadoReembolso: 'en_proceso',
    canceladoEn: new Date().toISOString(), guiaCancelada,
  }
  await pedidos.guardarCancelacion(referencia, cancelacion)
  console.log(`❌ ${referencia} cancelado.`)

  // 3. Correo al cliente
  const enviado = await notificaciones.avisarPedidoCancelado({ ...pedido, cancelacion })
  console.log(enviado ? `✉️  Se le avisó a ${pedido.cliente?.email}.` : '⚠️  No se pudo enviar el correo al cliente: avísale por WhatsApp.')

  // 4. Lo que queda a mano
  console.log('\nFALTA A MANO:')
  console.log(`  - Devolver $${Number(pedido.totalPesos).toLocaleString('es-CO')} en el panel de Wompi (transacción ${pedido.transaccionId || 'ver por referencia'}).`)
  if (pedido.factura?.estado === 'emitida') console.log(`  - Hacer una nota crédito en Alegra a la factura ${pedido.factura.numero}.`)
  else if (pedido.factura) console.log(`  - Borrar en Alegra el borrador de factura ${pedido.factura.numero || pedido.factura.id}.`)
  console.log(`  - Cuando el dinero se haya devuelto: node scripts/cancelar-pedido.js ${referencia} --reembolsado`)
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
