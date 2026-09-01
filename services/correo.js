// ============================================================
//  services/correo.js
//
//  Envío de correo por SMTP. Hoy lo usa el formulario de asesoría
//  (routes/asesoria.js) para avisarle al almacén.
//
//  Configuración en .env:
//    SMTP_HOST     smtp.zoho.com   (o smtp.zoho.eu según la región)
//    SMTP_PORT     465
//    SMTP_USER     oscarrussi@russitex.com
//    SMTP_PASS     contraseña de aplicación de Zoho (NO la del correo)
//    CORREO_DESTINO  a dónde llegan las solicitudes
//
//  La contraseña de aplicación se genera en Zoho:
//    Mi cuenta -> Seguridad -> Contraseñas de aplicación -> Generar
// ============================================================
const nodemailer = require('nodemailer')

let transporte = null

function configurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
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
 */
async function enviarCorreo({ asunto, texto, html, responderA, adjuntos = [], destino: destinoExplicito }) {
  const destino = destinoExplicito || process.env.CORREO_DESTINO || process.env.SMTP_USER
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

// Comprueba usuario y contraseña contra el servidor, sin enviar nada.
// Útil para diagnosticar cuando el envío falla.
async function verificarConexion() {
  return obtenerTransporte().verify()
}

module.exports = { enviarCorreo, verificarConexion, configurado }
