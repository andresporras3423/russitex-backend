// ============================================================
//  services/catalogo.js
//
//  Arma el catálogo público uniendo las dos fuentes de verdad:
//
//    Alegra          -> nombre, precio        (lo que se actualiza al facturar)
//    productos_meta  -> categoría, imagen     (Alegra no puede guardarlos)
//
//  Lo usan tanto GET /api/productos como el bot Rusti, para que
//  ambos vean exactamente los mismos precios.
//
//  Nunca expone datos sensibles de Alegra (costo, cuentas
//  contables, inventario): el filtrado ocurre acá, no en el prompt.
// ============================================================
const { obtenerProductos } = require('./alegra')
const { selectAll } = require('../database/supabase')

// 24 horas. En la práctica el caché suele morir antes, porque vive en la RAM
// del proceso y se pierde con cada reinicio o deploy.
// Ojo: acá viajan los PRECIOS. Si cambian en Alegra y no querés esperar,
// usá GET /api/productos?refrescar=1 o reiniciá el backend.
const CACHE_MS = 24 * 60 * 60 * 1000

let cache = { datos: null, expira: 0 }

// Las columnas jsonb llegan ya parseadas, pero pueden venir null (fila vieja)
// o como texto si alguien las cargó a mano desde el panel.
function asArray(valor) {
  if (Array.isArray(valor)) return valor
  if (typeof valor === 'string') {
    try {
      const p = JSON.parse(valor)
      return Array.isArray(p) ? p : []
    } catch { return [] }
  }
  return []
}

async function construirCatalogo() {
  // Si Supabase falla no tumbamos el catálogo: mostramos los productos
  // de Alegra sin categoría ni foto, que es mejor que no mostrar nada.
  const [productos, metas] = await Promise.all([
    obtenerProductos(),
    selectAll('productos_meta').catch((e) => {
      console.error('[catalogo] No se pudo leer productos_meta:', e.message)
      return []
    }),
  ])

  const metaPorId = new Map(metas.map((m) => [String(m.alegra_id), m]))

  return productos
    .filter((p) => p.activo)
    .map((p) => {
      const meta = metaPorId.get(p.alegraId) || {}
      return {
        id:        p.alegraId,
        nombre:    p.nombre,
        precio:    p.precio,
        unidad:    meta.unidad || p.unidadAlegra || '',
        categoria: meta.categoria || 'otros',
        imagen:    meta.imagen_url || null,
        orden:     meta.orden ?? 0,
        disponible: p.disponible,
        stockReal:  p.stockReal,

        // Contenido de la página de detalle. Todo opcional: la página
        // esconde la sección que venga vacía.
        descripcion:      meta.descripcion || null,
        descripcionLarga: meta.descripcion_larga || null,
        usos:             asArray(meta.usos),
        detalles:         asArray(meta.detalles),
        cuidados:         meta.cuidados || null,
        colores:          asArray(meta.colores),
        presentacion:     meta.presentacion || null,
        imagenes:         asArray(meta.imagenes),
      }
    })
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}

// Devuelve el catálogo, usando la caché si sigue vigente.
// `forzar` salta la caché (para el parámetro ?refrescar=1).
async function obtenerCatalogo({ forzar = false } = {}) {
  const ahora = Date.now()
  if (!forzar && cache.datos && ahora < cache.expira) {
    return { productos: cache.datos, desdeCache: true }
  }
  try {
    const productos = await construirCatalogo()
    cache = { datos: productos, expira: ahora + CACHE_MS }
    return { productos, desdeCache: false }
  } catch (e) {
    // Preferimos servir una copia vieja antes que dejar el catálogo vacío.
    if (cache.datos) {
      return { productos: cache.datos, desdeCache: true, advertencia: e.message }
    }
    throw e
  }
}

module.exports = { obtenerCatalogo }
