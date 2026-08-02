// ============================================================
//  services/tienda.js
//
//  Lee la información del local (horarios, contacto, envíos,
//  pagos, políticas) desde la tabla tienda_info de Supabase.
//
//  Es la fuente única: si mañana cambia un horario, se edita
//  ahí y tanto el bot como la web lo toman.
// ============================================================
const { selectAll } = require('../database/supabase')

// 24 horas: horarios, dirección y contacto casi nunca cambian.
// Para verlo al instante: GET /api/tienda?refrescar=1 o reiniciar el backend.
const CACHE_MS = 24 * 60 * 60 * 1000

let cache = { datos: null, expira: 0 }

const NOMBRES_GRUPO = {
  identidad:  'SOBRE EL ALMACÉN',
  horarios:   'HORARIOS DE ATENCIÓN',
  contacto:   'CONTACTO Y UBICACIÓN',
  envios:     'ENVÍOS Y ENTREGAS',
  pagos:      'FORMAS DE PAGO',
  politicas:  'ATENCIÓN Y ASESORÍA',
  general:    'OTROS DATOS',
}

async function obtenerInfoTienda({ forzar = false } = {}) {
  const ahora = Date.now()
  if (!forzar && cache.datos && ahora < cache.expira) return cache.datos

  const filas = await selectAll('tienda_info')
  filas.sort((a, b) => (a.grupo || '').localeCompare(b.grupo || '') || (a.orden ?? 0) - (b.orden ?? 0))
  cache = { datos: filas, expira: ahora + CACHE_MS }
  return filas
}

// Convierte las filas en texto agrupado, listo para el prompt del bot.
// Solo incluye lo marcado como visible_bot.
function formatearParaPrompt(filas) {
  const visibles = filas.filter((f) => f.visible_bot)
  if (visibles.length === 0) return ''

  const porGrupo = new Map()
  for (const f of visibles) {
    if (!porGrupo.has(f.grupo)) porGrupo.set(f.grupo, [])
    porGrupo.get(f.grupo).push(f)
  }

  const orden = ['identidad', 'horarios', 'contacto', 'envios', 'pagos', 'politicas', 'general']
  const bloques = []
  for (const grupo of orden) {
    const items = porGrupo.get(grupo)
    if (!items) continue
    items.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    bloques.push(
      `## ${NOMBRES_GRUPO[grupo] || grupo.toUpperCase()}\n` +
      items.map((i) => `- ${i.etiqueta}: ${i.valor}`).join('\n')
    )
  }
  return bloques.join('\n\n')
}

module.exports = { obtenerInfoTienda, formatearParaPrompt }
