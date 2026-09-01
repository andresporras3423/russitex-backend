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

// Agrupa filas por una clave, para no recorrer el arreglo entero por producto.
function agruparPor(filas, clave) {
  const mapa = new Map()
  for (const f of filas) {
    const k = String(f[clave])
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(f)
  }
  return mapa
}

const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0)

const aImagen = (i) => ({ url: i.url, alt: i.alt || null })

async function construirCatalogo() {
  // Si Supabase falla no tumbamos el catálogo: mostramos los productos
  // de Alegra sin categoría ni foto, que es mejor que no mostrar nada.
  const sinSupabase = (tabla) => (e) => {
    console.error(`[catalogo] No se pudo leer ${tabla}:`, e.message)
    return []
  }

  const [productos, metas, variantes, imagenes] = await Promise.all([
    obtenerProductos(),
    selectAll('productos_meta').catch(sinSupabase('productos_meta')),
    selectAll('producto_variantes').catch(sinSupabase('producto_variantes')),
    selectAll('producto_imagenes').catch(sinSupabase('producto_imagenes')),
  ])

  const metaPorId = new Map(metas.map((m) => [String(m.alegra_id), m]))
  const variantesPorProducto = agruparPor(variantes, 'alegra_id')
  const imagenesPorProducto  = agruparPor(imagenes, 'alegra_id')
  // Las de variante_id nulo quedan bajo la clave 'null'; se filtran aparte.
  const imagenesPorVariante  = agruparPor(imagenes.filter((i) => i.variante_id != null), 'variante_id')

  return productos
    .filter((p) => p.activo)
    .map((p) => {
      const meta = metaPorId.get(p.alegraId) || {}

      // Imágenes del producto (variante_id nulo): valen para todas las
      // variantes y sirven de respaldo si una no tiene fotos propias.
      const imgsProducto = (imagenesPorProducto.get(p.alegraId) || [])
        .filter((i) => i.variante_id == null)
        .sort(porOrden)
        .map(aImagen)

      const variantes = (variantesPorProducto.get(p.alegraId) || [])
        .sort(porOrden)
        .map((v) => {
          const propias = (imagenesPorVariante.get(String(v.id)) || []).sort(porOrden).map(aImagen)
          return {
            id:         v.id,
            nombre:     v.nombre,
            hex:        v.hex || null,
            // El chip del selector: su swatch, si no el color plano, si no
            // la primera foto que tenga. La ficha decide qué hacer si no hay nada.
            swatch:     v.swatch_url || null,
            disponible: v.disponible !== false,
            // Si la variante no tiene fotos propias usa las del producto.
            imagenes:   propias.length > 0 ? propias : imgsProducto,
          }
        })

      // Para estar disponible tienen que cumplirse las TRES condiciones.
      // Es un Y, no un O: si Alegra dice que no hay existencias del producto,
      // da igual que sus variantes estén marcadas como disponibles —  Alegra
      // lleva el inventario del producto entero, no de cada color.
      const disponible =
        p.disponible &&                        // inventario de Alegra
        meta.disponible !== false &&           // interruptor manual del producto
        (variantes.length === 0 || variantes.some((v) => v.disponible))

      return {
        id:        p.alegraId,
        nombre:    p.nombre,
        precio:    p.precio,
        unidad:    meta.unidad || p.unidadAlegra || '',
        categoria: meta.categoria || 'otros',
        imagen:    meta.imagen_url || null,
        orden:     meta.orden ?? 0,
        disponible,
        stockReal: p.stockReal,

        // Contenido de la página de detalle. Todo opcional: la página
        // esconde la sección que venga vacía.
        descripcion:      meta.descripcion || null,
        descripcionLarga: meta.descripcion_larga || null,
        usos:             asArray(meta.usos),
        detalles:         asArray(meta.detalles),
        cuidados:         meta.cuidados || null,
        presentacion:     meta.presentacion || null,

        // Variantes: `varianteEtiqueta` nulo = producto de presentación única.
        varianteEtiqueta: meta.variante_etiqueta || null,
        variantes,
        imagenes: imgsProducto,
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
