// ============================================================
//  routes/asesoria.js
//
//  POST /api/asesoria
//
//  Recibe el formulario "Cuéntanos sobre tu proyecto" de la página
//  de asesoría y le manda un correo al almacén.
//
//  El endpoint es público, así que valida todo lo que llega y limita
//  cuántas solicitudes acepta por IP.
// ============================================================
const express = require('express')
const router  = express.Router()
const { enviarCorreo, configurado } = require('../services/correo')

// Límite por IP. Mismo enfoque que el chat: vive en memoria, así que se
// reinicia con el servidor. Suficiente para frenar un formulario enviado
// en bucle; no reemplaza a un rate limit de verdad si esto crece.
const LIMITE = 5
const VENTANA_MS = 60 * 60 * 1000   // 1 hora
const usos = new Map()

function pasaLimite(ip) {
  const ahora = Date.now()
  const previos = (usos.get(ip) || []).filter((t) => ahora - t < VENTANA_MS)
  if (previos.length >= LIMITE) return false
  previos.push(ahora)
  usos.set(ip, previos)
  return true
}

const MAX_TEXTO = 2000
const MAX_IMAGEN_BYTES = 10 * 1024 * 1024   // el mismo tope que valida el formulario

function limpiar(valor, max = MAX_TEXTO) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : ''
}

function escaparHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Convierte el data URL que manda el navegador en un adjunto de nodemailer.
// Devuelve null si no es una imagen válida o si se pasa de tamaño.
function construirAdjunto(imagen) {
  if (!imagen || typeof imagen.dataUrl !== 'string') return null
  const m = imagen.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!m) return null
  const contenido = Buffer.from(m[2], 'base64')
  if (contenido.length === 0 || contenido.length > MAX_IMAGEN_BYTES) return null
  return {
    filename: limpiar(imagen.nombre, 120) || 'referencia.jpg',
    content: contenido,
    contentType: m[1],
  }
}

/**
 * `imagen` puede ser:
 *   'adjunta'   -> viajó como adjunto de este correo
 *   'rechazada' -> el cliente subió algo pero no se pudo adjuntar
 *   'ninguna'   -> no subió nada
 *
 * Las filas opcionales que vengan vacías no se pintan: el correo se lee
 * más rápido si solo trae lo que el cliente sí escribió.
 */
function armarCorreo(d, imagen = 'ninguna') {
  const filas = [
    ['Nombre', d.nombre],
    ['WhatsApp', d.wa],
    ['Qué confecciona', d.prenda],
    ['Qué necesita lograr', d.logro],
  ]

  if (d.tela) filas.push(['Tipo de tela', d.tela])
  if (d.comentarios) filas.push(['Comentarios', d.comentarios])

  if (imagen === 'adjunta') {
    filas.push(['Imagen de referencia', 'Adjunta a este correo'])
  } else if (imagen === 'rechazada') {
    // Importante avisarlo: el cliente cree que la mandó.
    filas.push(['Imagen de referencia', 'El cliente adjuntó una imagen, pero no se pudo procesar (formato no válido o superaba los 10 MB). Conviene pedírsela por WhatsApp.'])
  }

  const texto = filas.map(([k, v]) => `${k}: ${v}`).join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#3B302A;max-width:600px">
      <h2 style="font-size:17px;margin:0 0 4px">Nueva solicitud de asesoría</h2>
      <p style="font-size:13px;color:#6E665C;margin:0 0 18px">Enviada desde la página de asesoría de russitex.com</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">
        ${filas.map(([k, v]) => `
          <tr>
            <td style="padding:9px 12px;background:#F1EADC;border:1px solid #E0D8CB;font-weight:600;width:180px;vertical-align:top">${escaparHtml(k)}</td>
            <td style="padding:9px 12px;border:1px solid #E0D8CB;white-space:pre-wrap">${escaparHtml(v)}</td>
          </tr>`).join('')}
      </table>
      <p style="font-size:12px;color:#6E665C;margin-top:18px">
        Para responder, escríbele por WhatsApp al ${escaparHtml(d.wa)}.
      </p>
    </div>`

  return { texto, html }
}

router.post('/', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'desconocida'
  if (!pasaLimite(ip)) {
    return res.status(429).json({
      error: 'Recibimos varias solicitudes desde este equipo. Intenta más tarde.',
    })
  }

  const datos = {
    nombre:      limpiar(req.body?.nombre, 120),
    wa:          limpiar(req.body?.wa, 40),
    prenda:      limpiar(req.body?.prenda, 300),
    logro:       limpiar(req.body?.logro, 300),
    tela:        limpiar(req.body?.tela, 200),
    comentarios: limpiar(req.body?.comentarios),
  }

  const faltantes = ['nombre', 'wa', 'prenda', 'logro'].filter((c) => !datos[c])
  if (faltantes.length > 0) {
    return res.status(400).json({ error: `Faltan campos obligatorios: ${faltantes.join(', ')}.` })
  }

  if (!configurado()) {
    console.error('[asesoria] SMTP sin configurar: no se envió el correo de', datos.nombre)
    return res.status(503).json({
      error: 'El envío por correo no está disponible en este momento.',
    })
  }

  const adjunto = construirAdjunto(req.body?.imagen)
  // Si el cliente mandó algo en `imagen` pero construirAdjunto lo descartó,
  // hay que avisarlo en el correo: él cree que la envió.
  const intentoAdjuntar = Boolean(req.body?.imagen)
  const estadoImagen = adjunto ? 'adjunta' : (intentoAdjuntar ? 'rechazada' : 'ninguna')
  const { texto, html } = armarCorreo(datos, estadoImagen)

  try {
    const id = await enviarCorreo({
      asunto: `Asesoría: ${datos.nombre} — ${datos.prenda}`,
      texto,
      html,
      adjuntos: adjunto ? [adjunto] : [],
    })
    console.log(`[asesoria] Correo enviado (${id}) — ${datos.nombre}`)
    res.json({ ok: true, imagenAdjunta: Boolean(adjunto) })
  } catch (e) {
    // El cliente no debe ver detalles del servidor de correo.
    console.error('[asesoria] Falló el envío:', e.message)
    res.status(502).json({
      error: 'No pudimos enviar tu solicitud.',
    })
  }
})

module.exports = router
// Se expone para scripts/probar-correo.js, que permite revisar cómo queda
// el mensaje sin tener que llenar el formulario en la web.
module.exports.armarCorreo = armarCorreo
