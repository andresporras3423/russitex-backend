// ============================================================
//  scripts/mercadolibre-reporte.js  —  Cómo quedaría cada producto
//  publicado en Mercado Libre, SIN publicar nada.
//
//  Uso:  node scripts/mercadolibre-reporte.js [archivo.md]
//
//  Lee el catálogo (Alegra + Supabase) y, con el token guardado en
//  ml_tokens, consulta en Mercado Libre los datos obligatorios de cada
//  categoría. Solo hace lecturas (GET) a Mercado Libre.
// ============================================================
require('dotenv').config({ quiet: true })
const fs = require('fs')
const { obtenerCatalogo } = require('../services/catalogo')
const { getTokensFromDB } = require('../database/supabase')
const { supabaseAdmin } = require('../database/supabaseAdmin')

const API = 'https://api.mercadolibre.com'
const TITULO_MAX = 60

// Categoría de Mercado Libre para cada categoría de la tienda. La sugerencia
// automática de Mercado Libre falla con estos productos (propone hombreras
// ortopédicas o sábanas), así que se asignan a mano. Los productos sueltos
// que no encajan en su categoría van en EXCEPCIONES.
const CATEGORIAS = {
  forros: 'MCO441173',      // Mercería > Rollos de Tela
  entretelas: 'MCO441173',  // Mercería > Rollos de Tela
  guatas: 'MCO441173',      // Mercería > Rollos de Tela
  hombreras: 'MCO437080',   // Mercería > Costura y Bordado > Otros
  tizas: 'MCO437080',       // Mercería > Costura y Bordado > Otros (la de "Tizas" es papelería escolar)
  cierres: 'MCO441126',     // Mercería > Otros (la de "Cierres" es de bisutería)
  otros: 'MCO441126',       // Mercería > Otros
}
const EXCEPCIONES = [
  [/^bot[oó]n/i, 'MCO441134'],          // Mercería > Costura y Bordado > Botones
  [/portavestido/i, 'MCO417183'],       // Mercería > Fundas para Ropa
]

// Atributos obligatorios que se pueden llenar con un valor fijo de la tienda.
// El resto (marca, material, medidas…) hay que decidirlo producto por producto.
const FIJOS = {
  GTIN: null,                               // casi ningún producto tiene código de barras
  EMPTY_GTIN_REASON: 'No tiene código',     // se manda en su lugar
}

// Atributo de Mercado Libre -> columna de productos_meta donde se llena
// (database/productos_meta_mercadolibre.sql, panel: Información del producto).
const COLUMNAS_ML = {
  BRAND: 'ml_marca', MANUFACTURER: 'ml_fabricante', PRODUCT_TYPE: 'ml_tipo_producto', MATERIAL: 'ml_material',
  MODEL: 'ml_modelo', COLOR: 'ml_color', WIDTH: 'ml_ancho_cm', HEIGHT: 'ml_alto_cm',
}
const COLUMNA_PAQUETE = 'ml_unidades_paquete'

const money = (n) => `$${Number(n).toLocaleString('es-CO')}`

// Datos de Mercado Libre de cada producto, por alegra_id. Si las columnas
// todavía no existen (falta correr el SQL) el reporte sigue, todo como vacío.
async function datosML() {
  const { data, error } = await supabaseAdmin().from('productos_meta').select(['alegra_id', COLUMNA_PAQUETE, ...Object.values(COLUMNAS_ML)].join(', '))
  if (error) { console.warn('Aviso: no se leyeron los datos de Mercado Libre de productos_meta:', error.message); return {} }
  return Object.fromEntries(data.map((f) => [String(f.alegra_id), f]))
}

async function main() {
  const salida = process.argv[2] || 'mercadolibre-reporte.md'
  const { access_token: token, expires_at: vence } = await getTokensFromDB()
  if (!token || Date.now() > vence) throw new Error('El token de Mercado Libre está vencido: renuévalo antes de correr el reporte.')
  const ml = async (ruta) => {
    const r = await fetch(API + ruta, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`)
    return r.json()
  }

  const { productos } = await obtenerCatalogo({ forzar: true })
  const meta = await datosML()
  const cache = {}
  const categoria = async (id) => {
    if (!cache[id]) {
      const [c, attrs] = await Promise.all([ml(`/categories/${id}`), ml(`/categories/${id}/attributes`)])
      cache[id] = {
        nombre: c.path_from_root.map((p) => p.name).slice(1).join(' > '),
        minimo: c.settings?.minimum_price || 0,
        obligatorios: attrs.filter((a) => a.tags?.required).map((a) => ({ id: a.id, nombre: a.name })),
      }
    }
    return cache[id]
  }

  const filas = []
  for (const p of productos) {
    const idCat = EXCEPCIONES.find(([re]) => re.test(p.nombre))?.[1] || CATEGORIAS[p.categoria]
    const cat = await categoria(idCat)
    const fotos = new Set([p.imagen, ...(p.imagenes || []).map((i) => i.url || i)].filter(Boolean)).size
    const faltan = []
    if (!fotos) faltan.push('fotos')
    if (!p.descripcion) faltan.push('descripción')
    if (!p.pesoUnit) faltan.push('peso')
    if (!p.volumenUnit) faltan.push('medidas')
    // Paquete: el que se haya fijado en el panel o, si no, el mínimo para
    // llegar al precio mínimo de Mercado Libre (de a 1 si ya lo supera).
    const paquete = meta[String(p.id)]?.[COLUMNA_PAQUETE] || Math.max(1, Math.ceil(cat.minimo / p.precio))
    const precioML = p.precio * paquete
    if (precioML < cat.minimo) faltan.push(`precio bajo el mínimo (${money(cat.minimo)}): el paquete fijado debe ser de ${Math.ceil(cat.minimo / p.precio)} o más`)
    if (p.nombre.length > TITULO_MAX) faltan.push(`título de más de ${TITULO_MAX} letras`)
    // Atributos obligatorios: "Marca: Genérica" si ya está lleno, "Marca: falta" si no.
    const atributos = cat.obligatorios.filter((a) => !(a.id in FIJOS)).map((a) => {
      const valor = meta[String(p.id)]?.[COLUMNAS_ML[a.id]]
      return { nombre: a.nombre, valor: valor ?? null, falta: valor == null || valor === '' }
    })
    filas.push({ p, idCat, cat, fotos, faltan, atributos, paquete, precioML })
  }

  const listos = filas.filter((f) => !f.faltan.length && !f.atributos.some((a) => a.falta))
  const lineas = [
    '# Mercado Libre: reporte de publicaciones (sin publicar)',
    '',
    `Generado el ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}. ${productos.length} productos; ${listos.length} con todos los datos (tienda y Mercado Libre).`,
    '',
    'Notas generales:',
    '- Las fotos actuales son de prueba: hay que cambiarlas por fotos reales antes de publicar.',
    '- La tienda no lee las cantidades de inventario de Alegra (solo disponible / agotado). Mercado Libre pide una cantidad.',
    '- Precio: el mismo de la web, mientras no se decida un recargo.',
    '- Código de barras: se declara que el producto no tiene.',
    '',
    '| Producto | Categoría en Mercado Libre | Precio | Fotos | Falta en la tienda | Datos que pide Mercado Libre |',
    '|---|---|---|---|---|---|',
    ...filas.map(({ p, idCat, cat, fotos, faltan, atributos, paquete, precioML }) =>
      `| ${p.nombre}${p.variantes?.length ? ` (${p.variantes.length} variantes)` : ''} | ${cat.nombre} (${idCat}) | ${money(precioML)} ${paquete > 1 ? `(paquete de ${paquete})` : (p.unidad ? p.unidad.toLowerCase() : '')} | ${fotos} | ${faltan.join('; ') || '—'} | ${atributos.map((a) => `${a.nombre}: ${a.falta ? '**falta**' : a.valor}`).join(', ')} |`),
    '',
  ]
  fs.writeFileSync(salida, lineas.join('\n'))
  console.log(`Reporte en ${salida}: ${productos.length} productos, ${listos.length} con todos los datos.`)
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1) })
