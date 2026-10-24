// ============================================================
//  routes/admin.js  —  Panel de administrador (/admin en la web)
//
//  Todo pasa por verificarAuth + soloAdmin (ADMIN_EMAILS).
//
//  Productos
//    GET    /api/admin/productos                     lista con imágenes, disponibilidad y variantes
//    PUT    /api/admin/productos/:id/disponible      { disponible }  (productos sin variantes)
//    PUT    /api/admin/variantes/:id/disponible      { disponible }
//    POST   /api/admin/productos/:id/imagenes        { tipo, datosBase64 }  sube una imagen al final
//    PUT    /api/admin/productos/:id/imagenes/orden  { ids: [...] }  la primera es la portada
//    DELETE /api/admin/imagenes/:imgId
//  Pedidos
//    GET    /api/admin/pedidos
//    GET    /api/admin/pedidos/:ref
//    POST   /api/admin/pedidos/:ref/cancelar         { motivo, agotados: [] }
//    POST   /api/admin/pedidos/:ref/reembolsado
//
//  Imágenes: la galería del producto vive en producto_imagenes (variante_id
//  nulo) y la portada del catálogo en productos_meta.imagen_url. Después de
//  cada cambio la portada = la primera de la galería. Las subidas van al
//  bucket productos_russitex, carpeta subidas/<id>/; solo esas se borran
//  del bucket (los archivos viejos los comparten varios productos).
// ============================================================
const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const verificarAuth = require('../middleware/verificarAuth')
const soloAdmin = require('../middleware/soloAdmin')
const { supabaseAdmin } = require('../database/supabaseAdmin')
const { obtenerCatalogo, invalidarCatalogo } = require('../services/catalogo')
const pedidosSrv = require('../services/pedidos')
const { estadoParaCliente } = require('./pedidos')
const { cancelarPedido, marcarReembolsado, ErrorCancelacion } = require('../services/cancelaciones')

const BUCKET = 'productos_russitex'
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_BYTES = 6 * 1024 * 1024

router.use(verificarAuth, soloAdmin)

const db = () => supabaseAdmin()
const fallo = (res, e, quien) => {
  if (e instanceof ErrorCancelacion) return res.status(400).json({ error: e.message })
  console.error(`[admin] ${quien}:`, e.message)
  res.status(500).json({ error: 'No se pudo completar la acción. Intenta de nuevo.' })
}
const sinError = ({ data, error }) => { if (error) throw new Error(error.message); return data }

// ------------------------------------------------------------
// Productos
// ------------------------------------------------------------
async function galerias() {
  const filas = sinError(await db().from('producto_imagenes').select('id, alegra_id, url, orden')
    .is('variante_id', null).order('orden').order('id'))
  const porProducto = new Map()
  for (const f of filas) {
    if (!porProducto.has(f.alegra_id)) porProducto.set(f.alegra_id, [])
    porProducto.get(f.alegra_id).push({ id: f.id, url: f.url })
  }
  return porProducto
}

router.get('/productos', async (req, res) => {
  try {
    const { productos } = await obtenerCatalogo()
    const metas = sinError(await db().from('productos_meta').select('alegra_id, disponible, imagen_url'))
    const variantes = sinError(await db().from('producto_variantes').select('id, alegra_id, nombre, disponible, orden').order('orden').order('id'))
    const metaPorId = new Map(metas.map((m) => [String(m.alegra_id), m]))
    let fotos = await galerias()

    // Productos con portada pero sin galería (los cargados antes del panel):
    // la portada pasa a ser la primera imagen de su galería, una sola vez.
    const sinGaleria = productos.filter((p) => !fotos.has(String(p.id)) && metaPorId.get(String(p.id))?.imagen_url)
    if (sinGaleria.length) {
      sinError(await db().from('producto_imagenes').insert(sinGaleria.map((p) => ({
        alegra_id: String(p.id), variante_id: null, url: metaPorId.get(String(p.id)).imagen_url, orden: 0,
      }))))
      fotos = await galerias()
    }

    res.json({
      productos: productos.map((p) => {
        const meta = metaPorId.get(String(p.id)) || {}
        return {
          id: String(p.id),
          nombre: p.nombre,
          categoria: p.categoria,
          disponible: meta.disponible !== false,
          imagenes: fotos.get(String(p.id)) || [],
          variantes: variantes.filter((v) => String(v.alegra_id) === String(p.id))
            .map((v) => ({ id: v.id, nombre: v.nombre, disponible: v.disponible !== false })),
        }
      }),
    })
  } catch (e) { fallo(res, e, 'listar productos') }
})

router.put('/productos/:id/disponible', async (req, res) => {
  try {
    const disponible = Boolean(req.body?.disponible)
    sinError(await db().from('productos_meta').upsert({ alegra_id: req.params.id, disponible, actualizado: new Date().toISOString() }, { onConflict: 'alegra_id' }))
    invalidarCatalogo()
    res.json({ ok: true, disponible })
  } catch (e) { fallo(res, e, 'disponibilidad producto') }
})

router.put('/variantes/:id/disponible', async (req, res) => {
  try {
    const disponible = Boolean(req.body?.disponible)
    const filas = sinError(await db().from('producto_variantes').update({ disponible, actualizado: new Date().toISOString() })
      .eq('id', req.params.id).select('id'))
    if (!filas.length) return res.status(404).json({ error: 'Esa variante no existe.' })
    invalidarCatalogo()
    res.json({ ok: true, disponible })
  } catch (e) { fallo(res, e, 'disponibilidad variante') }
})

// La portada del catálogo = la primera imagen de la galería.
async function sincronizarPortada(alegraId) {
  const filas = sinError(await db().from('producto_imagenes').select('url').eq('alegra_id', alegraId)
    .is('variante_id', null).order('orden').order('id').limit(1))
  sinError(await db().from('productos_meta').upsert({ alegra_id: alegraId, imagen_url: filas[0]?.url || null, actualizado: new Date().toISOString() }, { onConflict: 'alegra_id' }))
  invalidarCatalogo()
}

const galeriaDe = async (alegraId) => (await galerias()).get(alegraId) || []

router.post('/productos/:id/imagenes', async (req, res) => {
  try {
    const alegraId = req.params.id
    const ext = TIPOS[req.body?.tipo]
    if (!ext) return res.status(400).json({ error: 'Solo se aceptan imágenes JPG, PNG o WebP.' })
    const buffer = Buffer.from(String(req.body?.datosBase64 || ''), 'base64')
    if (!buffer.length) return res.status(400).json({ error: 'No llegó la imagen.' })
    if (buffer.length > MAX_BYTES) return res.status(400).json({ error: 'La imagen pesa más de 6 MB.' })

    const ruta = `subidas/${alegraId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
    sinError(await db().storage.from(BUCKET).upload(ruta, buffer, { contentType: req.body.tipo, upsert: false }))
    const url = db().storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl

    const actuales = await galeriaDe(alegraId)
    sinError(await db().from('producto_imagenes').insert({ alegra_id: alegraId, variante_id: null, url, orden: actuales.length }))
    await sincronizarPortada(alegraId)
    res.json({ imagenes: await galeriaDe(alegraId) })
  } catch (e) { fallo(res, e, 'subir imagen') }
})

router.put('/productos/:id/imagenes/orden', async (req, res) => {
  try {
    const alegraId = req.params.id
    const ids = (req.body?.ids || []).map(Number)
    const actuales = await galeriaDe(alegraId)
    const iguales = ids.length === actuales.length && actuales.every((i) => ids.includes(i.id))
    if (!iguales) return res.status(409).json({ error: 'Las imágenes cambiaron. Recarga la página.' })
    for (const [orden, id] of ids.entries()) {
      sinError(await db().from('producto_imagenes').update({ orden, actualizado: new Date().toISOString() }).eq('id', id))
    }
    await sincronizarPortada(alegraId)
    res.json({ imagenes: await galeriaDe(alegraId) })
  } catch (e) { fallo(res, e, 'ordenar imágenes') }
})

router.delete('/imagenes/:imgId', async (req, res) => {
  try {
    const filas = sinError(await db().from('producto_imagenes').delete().eq('id', req.params.imgId).select('alegra_id, url'))
    if (!filas.length) return res.status(404).json({ error: 'Esa imagen no existe.' })
    const { alegra_id: alegraId, url } = filas[0]
    // Solo se borra el archivo si lo subió el panel (los viejos se comparten).
    const marca = `/${BUCKET}/subidas/`
    if (url.includes(marca)) {
      const ruta = 'subidas/' + url.split(marca)[1]
      const { error } = await db().storage.from(BUCKET).remove([ruta])
      if (error) console.warn('[admin] No se pudo borrar del bucket:', ruta, error.message)
    }
    await sincronizarPortada(alegraId)
    res.json({ imagenes: await galeriaDe(alegraId) })
  } catch (e) { fallo(res, e, 'eliminar imagen') }
})

// ------------------------------------------------------------
// Pedidos
// ------------------------------------------------------------
const nombreCliente = (c = {}) => c.empresa?.razonSocial || c.nombre || c.email || '—'

router.get('/pedidos', async (req, res) => {
  try {
    const filas = sinError(await db().from('pedidos').select('*').order('creado_en', { ascending: false }).limit(300))
    const hace24h = Date.now() - 24 * 60 * 60 * 1000
    res.json({
      pedidos: filas
        // Los pendientes viejos son pagos abandonados en Wompi: solo estorban.
        .filter((f) => f.estado !== 'PENDIENTE' || new Date(f.creado_en).getTime() > hace24h)
        .map((f) => {
          const p = { estado: f.estado, guia: f.guia, cancelacion: f.cancelacion }
          return {
            referencia: f.referencia,
            creadoEn: f.creado_en,
            cliente: nombreCliente(f.cliente),
            total: f.total_pesos,
            estadoCliente: estadoParaCliente(p),
          }
        }),
    })
  } catch (e) { fallo(res, e, 'listar pedidos') }
})

router.get('/pedidos/:ref', async (req, res) => {
  try {
    const p = await pedidosSrv.buscarPorReferencia(req.params.ref)
    if (!p) return res.status(404).json({ error: 'Ese pedido no existe.' })
    const c = p.cliente || {}
    const e = p.envio || {}
    res.json({
      referencia: p.referencia,
      estado: p.estado,
      creadoEn: p.creadoEn,
      estadoCliente: estadoParaCliente(p),
      total: p.totalPesos,
      metodoPago: p.metodoPago,
      transaccionId: p.transaccionId,
      cliente: {
        nombre: nombreCliente(c), contacto: c.nombre, email: c.email, telefono: c.telefono,
        documento: c.documento ? `${c.tipoDocumento || ''} ${c.documento}`.trim() : null,
        empresa: c.empresa ? { razonSocial: c.empresa.razonSocial, nit: c.empresa.nit } : null,
        avisosWhatsapp: Boolean(c.avisosWhatsapp),
      },
      envio: {
        modalidad: e.modalidad, direccion: e.direccion, ciudad: e.ciudad, departamento: e.departamento,
        transportadora: e.transportadora, costo: Number(e.costo) || 0, envioGratis: Boolean(e.envioGratis),
      },
      productos: (p.carrito || []).map((i) => ({ nombre: i.nombre, variante: i.variante || null, cantidad: i.cantidad, unidad: i.unidad || null, precio: i.precio })),
      guia: p.guia ? { numeroGuia: p.guia.numeroGuia, rastreoUrl: p.guia.rastreoUrl, etiquetaUrl: p.guia.etiquetaUrl, estado: p.guia.estado || null, ambiente: p.guia.ambiente } : null,
      factura: p.factura || null,
      cancelacion: p.cancelacion || null,
    })
  } catch (e) { fallo(res, e, 'detalle pedido') }
})

router.post('/pedidos/:ref/cancelar', async (req, res) => {
  try {
    const agotados = Array.isArray(req.body?.agotados) ? req.body.agotados : []
    const r = await cancelarPedido(req.params.ref, { motivo: req.body?.motivo, agotados })
    console.log(`❌ [admin] ${req.usuario.email} canceló ${req.params.ref}`)
    res.json({ ok: true, guiaCancelada: r.guia?.ok ?? null, correo: r.correo, pendientes: r.pendientes })
  } catch (e) { fallo(res, e, 'cancelar pedido') }
})

router.post('/pedidos/:ref/reembolsado', async (req, res) => {
  try {
    await marcarReembolsado(req.params.ref)
    console.log(`✅ [admin] ${req.usuario.email} marcó reembolsado ${req.params.ref}`)
    res.json({ ok: true })
  } catch (e) { fallo(res, e, 'marcar reembolsado') }
})

module.exports = router
