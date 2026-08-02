// ============================================================
//  scripts/sync-productos.js
//
//  Lee los productos de Alegra y deja lista una fila por producto
//  en productos_meta, para que solo tengas que completar la
//  categoría y la imagen (los datos que Alegra no guarda).
//
//  NO pisa la categoría/imagen que ya hayas cargado: solo crea las
//  filas que faltan y refresca el nombre de referencia.
//
//  Uso:
//    node -r dotenv/config scripts/sync-productos.js          (vista previa)
//    node -r dotenv/config scripts/sync-productos.js --escribir  (guarda)
//
//  Para escribir en Supabase hace falta la clave service_role
//  (SUPABASE_SERVICE_KEY en el .env), porque la tabla tiene RLS y
//  la clave publicable solo puede leer. Si no la tenés, corré el
//  script sin --escribir: te genera un archivo .sql para pegar en
//  el editor SQL de Supabase.
// ============================================================
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { obtenerProductos } = require('../services/alegra')

const ESCRIBIR = process.argv.includes('--escribir')

// Adivina la categoría a partir del nombre, para ahorrarte trabajo manual.
// Es solo un punto de partida: revisá y corregí en Supabase.
function adivinarCategoria(nombre) {
  const n = nombre.toLowerCase()
  if (n.includes('forro')) return 'forros'
  if (n.includes('entretela')) return 'entretelas'
  if (n.includes('hombrera')) return 'hombreras'
  if (n.includes('guata')) return 'guatas'
  if (n.includes('tiza')) return 'tizas'
  if (n.includes('cremallera') || n.includes('cierre')) return 'cierres'
  return 'otros'
}

function adivinarUnidad(nombre) {
  const n = nombre.toLowerCase()
  if (n.includes('hombrera')) return 'Por par'
  if (n.includes('caja')) return 'Por caja'
  if (n.includes('cremallera') || n.includes('banrol') || n.includes('borraflojo')) return 'Por unidad'
  return 'Por metro'
}

function escaparSQL(v) {
  if (v === null || v === undefined) return 'null'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  console.log('Consultando productos en Alegra...')
  const productos = await obtenerProductos()
  console.log(`Alegra devolvió ${productos.length} productos.\n`)

  if (productos.length === 0) {
    console.log('No hay nada que sincronizar.')
    return
  }

  const filas = productos.map((p) => ({
    alegra_id:    p.alegraId,
    nombre_cache: p.nombre,
    categoria:    adivinarCategoria(p.nombre),
    unidad:       adivinarUnidad(p.nombre),
  }))

  console.log('Categorías sugeridas (revisalas después en Supabase):')
  for (const f of filas) {
    console.log(`  ${f.alegra_id.padStart(4)}  ${f.nombre_cache.padEnd(34)} -> ${f.categoria} / ${f.unidad}`)
  }
  console.log('')

  if (!ESCRIBIR) {
    // Genera SQL para pegar en el editor de Supabase. ON CONFLICT deja
    // intactas las filas que ya existan (no pisa tu categoría ni tu imagen).
    const valores = filas
      .map((f) => `  (${escaparSQL(f.alegra_id)}, ${escaparSQL(f.nombre_cache)}, ${escaparSQL(f.categoria)}, ${escaparSQL(f.unidad)})`)
      .join(',\n')

    const sql = `-- Generado por scripts/sync-productos.js
-- Pegalo en Supabase -> SQL Editor -> Run
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad)
values
${valores}
on conflict (alegra_id) do update
  set nombre_cache = excluded.nombre_cache;
`
    const destino = path.join(__dirname, 'productos_meta_seed.sql')
    fs.writeFileSync(destino, sql, 'utf8')
    console.log(`Vista previa. No se escribió en Supabase.`)
    console.log(`SQL generado en: ${destino}`)
    console.log(`Pegalo en Supabase -> SQL Editor, o volvé a correr con --escribir.`)
    return
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.warn('Aviso: no hay SUPABASE_SERVICE_KEY; se usará SUPABASE_KEY.')
    console.warn('Si la tabla tiene RLS activo, la escritura va a fallar.\n')
  }

  const supabase = createClient(url, key)

  // Qué filas existen ya. Las que existen NO se tocan salvo el nombre de
  // referencia: si ya corregiste su categoría o le pusiste imagen, se respeta.
  const { data: existentes, error: errLectura } = await supabase
    .from('productos_meta')
    .select('alegra_id')

  if (errLectura) {
    console.error('No se pudo leer productos_meta:', errLectura.message)
    console.error('¿Ya corriste database/productos_meta.sql en Supabase?')
    process.exitCode = 1
    return
  }

  const yaExisten = new Set((existentes || []).map((r) => String(r.alegra_id)))
  const nuevas = filas.filter((f) => !yaExisten.has(f.alegra_id))
  const previas = filas.filter((f) => yaExisten.has(f.alegra_id))

  if (nuevas.length > 0) {
    const { error } = await supabase.from('productos_meta').insert(nuevas)
    if (error) {
      console.error('Falló la escritura en Supabase:', error.message)
      console.error('Si el mensaje menciona RLS o permisos, usá SUPABASE_SERVICE_KEY')
      console.error('o corré el script sin --escribir y pegá el SQL a mano.')
      process.exitCode = 1
      return
    }
  }

  // Solo refrescamos el nombre de referencia de las que ya estaban.
  for (const f of previas) {
    await supabase
      .from('productos_meta')
      .update({ nombre_cache: f.nombre_cache })
      .eq('alegra_id', f.alegra_id)
  }

  console.log(`Listo. Filas nuevas: ${nuevas.length}. Ya existían (respetadas): ${previas.length}.`)
  if (nuevas.length > 0) {
    console.log('Ahora completá imagen_url (y revisá las categorías) desde Supabase.')
  }
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exitCode = 1
})
