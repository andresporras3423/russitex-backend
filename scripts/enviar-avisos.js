// ============================================================
//  scripts/enviar-avisos.js
//
//  Manda los avisos de "avísame cuando esté disponible" que ya
//  correspondan: los que apuntan a algo que volvió a estar disponible.
//
//    node scripts/enviar-avisos.js                -> solo muestra qué haría
//    node scripts/enviar-avisos.js --enviar       -> los manda de verdad
//    node scripts/enviar-avisos.js --producto 13  -> limita a un producto
//
//  Sin --enviar no manda ni marca nada: sirve para revisar antes.
//
//  Este script existe porque hoy la disponibilidad se marca a mano en
//  Supabase y nadie dispara el envío. Cuando exista la pantalla de
//  administración lo hará ella sola, y este script quedará solo para
//  revisar. Llama al servicio directamente, así que no necesita ni el
//  servidor levantado ni AVISOS_SECRETO.
// ============================================================
require('dotenv').config()

const { enviarPendientes } = require('../services/avisos')

const ETIQUETAS = {
  'enviado':      'enviado',
  'se-enviaria':  'SE ENVIARÍA',
  'sigue-agotado':'sigue agotado, se deja pendiente',
  'sin-producto': 'el producto ya no está en el catálogo',
  'sin-variante': 'la variante ya no existe',
  'fallo':        'FALLÓ EL ENVÍO',
}

async function main() {
  const enviar = process.argv.includes('--enviar')
  const i = process.argv.indexOf('--producto')
  const alegraId = i !== -1 ? process.argv[i + 1] : null

  if (i !== -1 && !alegraId) {
    console.error('--producto necesita un id. Ejemplo: --producto 13')
    process.exit(1)
  }

  console.log(alegraId ? `Revisando avisos del producto ${alegraId}...` : 'Revisando todos los avisos pendientes...')
  if (!enviar) console.log('(modo prueba: no se manda ni se marca nada)\n')

  const r = await enviarPendientes({ alegraId, simular: !enviar })

  if (r.revisados === 0) {
    console.log('No hay avisos pendientes.')
    return
  }

  console.log(`Pendientes revisados: ${r.revisados}\n`)
  for (const d of r.detalle) {
    const quien = d.correo ? ` — ${d.correo}` : ''
    const extra = d.producto ? ` (${d.producto})` : ''
    console.log(`  #${d.id}  ${ETIQUETAS[d.estado] || d.estado}${quien}${extra}`)
    if (d.error) console.log(`         ${d.error}`)
  }

  if (enviar) {
    console.log(`\nEnviados: ${r.enviados}   Fallidos: ${r.fallidos}`)
    if (r.fallidos > 0) console.log('Los fallidos siguen pendientes: se reintentan la próxima vez.')
  } else {
    const listos = r.detalle.filter((d) => d.estado === 'se-enviaria').length
    console.log(`\nSe enviarían ${listos} correos.`)
    console.log('Para mandarlos de verdad:  node scripts/enviar-avisos.js --enviar')
  }
}

main().catch((e) => {
  console.error('\nFalló:', e.message)
  process.exit(1)
})
