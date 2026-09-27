// ============================================================
//  services/correo.js
//
//  Envío de correo. Lo usan el formulario de asesoría (routes/asesoria.js)
//  y los correos de pedidos (services/notificaciones.js).
//
//  Dos formas, se usa la primera que esté configurada:
//
//  1. Resend (API por HTTPS). Es la que sirve en Render: el plan gratis
//     bloquea los puertos SMTP desde el 2026-09-26.
//       RESEND_API_KEY     re_...
//       RESEND_REMITENTE   dirección del dominio verificado en Resend,
//                          p. ej. pedidos@notificaciones.russitex.com
//
//  2. SMTP de Zoho (sirve en local):
//       SMTP_HOST     smtp.zoho.com   (o smtp.zoho.eu según la región)
//       SMTP_PORT     465
//       SMTP_USER     oscarrussi@russitex.com
//       SMTP_PASS     contraseña de aplicación de Zoho (NO la del correo)
//     La contraseña de aplicación se genera en Zoho:
//       Mi cuenta -> Seguridad -> Contraseñas de aplicación -> Generar
//
//  CORREO_DESTINO: a dónde llegan los avisos para la tienda.
// ============================================================
const nodemailer = require('nodemailer')

let transporte = null

const usaResend = () => Boolean(process.env.RESEND_API_KEY)

function configurado() {
  return usaResend() || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

// El transporte se crea una sola vez y se reutiliza: abrir una conexión
// SMTP por cada correo es lento y Zoho lo penaliza.
function obtenerTransporte() {
  if (!configurado()) {
    throw new Error('Faltan SMTP_HOST, SMTP_USER o SMTP_PASS en el archivo .env')
  }
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT) || 465
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,   // 465 = SSL directo; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Los valores por defecto de nodemailer esperan hasta minutos: si el
      // servidor no responde (p. ej. el plan gratis de Render bloquea el
      // puerto), mejor fallar rápido.
      connectionTimeout: 15000,
      greetingTimeout:   10000,
      socketTimeout:     20000,
    })
  }
  return transporte
}

/**
 * Envía un correo. `adjuntos` va en el formato de nodemailer:
 *   [{ filename, content: Buffer, contentType }]
 *
 * `destino` es opcional: si no se pasa va a CORREO_DESTINO, que es lo que
 * usa el formulario de asesoría para avisarle al almacén. Se pasa cuando
 * el correo va dirigido a un cliente.
 *
 * `idempotencia` (opcional, solo Resend): una clave única del correo, p. ej.
 * "aprobado-PEDIDO-123". Si se repite en 24 h, Resend no lo manda dos veces.
 */
async function enviarCorreo({ asunto, texto, html, responderA, adjuntos = [], destino: destinoExplicito, idempotencia }) {
  const destino = destinoExplicito || process.env.CORREO_DESTINO || process.env.SMTP_USER
  if (usaResend()) {
    return enviarPorResend({ destino, asunto, texto, html, responderA, adjuntos, idempotencia })
  }

  // El remitente puede ser un ALIAS de la cuenta autenticada (Zoho lo
  // permite), pero nunca una dirección ajena: eso sí lo rechaza.
  // Si CORREO_REMITENTE está vacío se usa la cuenta misma.
  const remitente = process.env.CORREO_REMITENTE || process.env.SMTP_USER

  const info = await obtenerTransporte().sendMail({
    from: `"Russitex" <${remitente}>`,
    to: destino,
    subject: asunto,
    text: texto,
    html,
    replyTo: responderA || undefined,
    attachments: adjuntos,
  })
  return info.messageId
}

// Resend: POST https://api.resend.com/emails. Los adjuntos van en base64.
async function enviarPorResend({ destino, asunto, texto, html, responderA, adjuntos, idempotencia }) {
  const remitente = process.env.RESEND_REMITENTE
  if (!remitente) throw new Error('Falta RESEND_REMITENTE (dirección del dominio verificado en Resend)')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(idempotencia ? { 'Idempotency-Key': idempotencia } : {}),
    },
    body: JSON.stringify({
      from: `Russitex <${remitente}>`,
      to: [destino],
      subject: asunto,
      text: texto,
      html,
      reply_to: responderA || undefined,
      attachments: adjuntos.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        content_type: a.contentType,
      })),
    }),
    signal: AbortSignal.timeout(20000),
  })
  const datos = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${datos.message || JSON.stringify(datos)}`)
  return datos.id
}

// Comprueba la configuración sin enviar nada. Útil para diagnosticar cuando
// el envío falla. Con Resend consulta los dominios de la cuenta.
async function verificarConexion() {
  if (usaResend()) {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Resend respondió ${res.status}`)
    return true
  }
  return obtenerTransporte().verify()
}

module.exports = { enviarCorreo, verificarConexion, configurado }
