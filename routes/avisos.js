// ============================================================
//  routes/avisos.js
//
//  POST /api/avisos          — el cliente pide que le avisen (público)
//  POST /api/avisos/enviar   — manda los avisos que correspondan (privado)
//
//  El primero es público, así que valida todo y limita por IP.
//  El segundo manda correos: exige un secreto compartido.
// ============================================================
const express = require('express')
const router  = express.Router()
const { guardarAviso, enviarPendientes } = require('../services/avisos')

// Mismo enfoque que el formulario de asesoría: en memoria, se reinicia
// con el servidor. Frena un bucle, no reemplaza un rate limit de verdad.
// El tope es más alto que en asesoría porque anotarse en varios productos
// de una visita es normal.
const LIMITE = 15
const VENTANA_MS = 60 * 60 * 1000
const usos = new Map()

function pasaLimite(ip) {
  const ahora = Date.now()
  const previos = (usos.get(ip) || []).filter((t) => ahora - t < VENTANA_MS)
  if (previos.length >= LIMITE) return false
  previos.push(ahora)
  usos.set(ip, previos)
  return true
}


// ------------------------------------------------------------
//  POST /api/avisos    { correo, alegraId, varianteId? }
// ------------------------------------------------------------
router.post('/', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'desconocida'
  if (!pasaLimite(ip)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes desde este equipo. Intenta más tarde.' })
  }

  const correo    = String(req.body?.correo || '').trim()
  const alegraId  = String(req.body?.alegraId ?? '').trim()
  const varianteBruta = req.body?.varianteId

  if (!correo || !alegraId) {
    return res.status(400).json({ error: 'Faltan el correo o el producto.' })
  }

  // La variante es opcional (NULL = el producto entero), pero si viene
  // tiene que ser un número: la columna es bigint y un texto reventaría
  // la consulta en vez de dar un error claro.
  let varianteId = null
  if (varianteBruta !== undefined && varianteBruta !== null && varianteBruta !== '') {
    varianteId = Number(varianteBruta)
    if (!Number.isInteger(varianteId)) {
      return res.status(400).json({ error: 'La variante no es válida.' })
    }
  }

  try {
    const { repetido } = await guardarAviso({
      correo,
      alegraId,
      varianteId,
      // Si hay sesión se guarda el id; si no, el aviso funciona igual.
      // No se toma del body: eso lo podría inventar cualquiera.
      usuarioId: req.usuario?.id || null,
    })
    console.log(`[avisos] Anotado ${correo} — producto ${alegraId}${varianteId ? ` variante ${varianteId}` : ''}${repetido ? ' (ya estaba)' : ''}`)
    // Al cliente le da igual si ya estaba: quedó anotado, que es lo que pidió.
    res.json({ ok: true })
  } catch (e) {
    if (e.publico) return res.status(400).json({ error: e.message })
    console.error('[avisos] Falló al guardar:', e.message)
    res.status(500).json({ error: 'No pudimos guardar tu aviso.' })
  }
})


// ------------------------------------------------------------
//  POST /api/avisos/enviar   { alegraId?, simular? }
//
//  Dispara el envío. Lo van a llamar:
//    - la pantalla de administración, al marcar algo como disponible
//    - un Database Webhook de Supabase, cuando el backend esté desplegado
//
//  Manda correos a terceros, así que va detrás de un secreto. Si
//  AVISOS_SECRETO no está en el .env, el endpoint queda cerrado: es
//  preferible a dejarlo abierto por descuido. Para dispararlo sin
//  configurar nada está scripts/enviar-avisos.js, que llama al servicio
//  directamente y no pasa por HTTP.
// ------------------------------------------------------------
router.post('/enviar', async (req, res) => {
  const secreto = process.env.AVISOS_SECRETO
  if (!secreto) {
    console.error('[avisos] /enviar rechazado: falta AVISOS_SECRETO en el .env')
    return res.status(503).json({ error: 'El disparo de avisos no está configurado.' })
  }
  if (req.get('x-avisos-secreto') !== secreto) {
    return res.status(401).json({ error: 'No autorizado.' })
  }

  try {
    const resultado = await enviarPendientes({
      alegraId: req.body?.alegraId || null,
      simular: Boolean(req.body?.simular),
    })
    console.log(`[avisos] Enviados ${resultado.enviados} de ${resultado.revisados} pendientes (${resultado.fallidos} fallos)`)
    res.json(resultado)
  } catch (e) {
    console.error('[avisos] Falló el envío:', e.message)
    res.status(500).json({ error: 'No se pudieron enviar los avisos.' })
  }
})


module.exports = router
