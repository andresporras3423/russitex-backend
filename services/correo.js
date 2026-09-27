// ============================================================
//  services/correo.js
//
//  Envío de correo. Lo usan el formulario de asesoría (routes/asesoria.js)
//  y los correos de pedidos (services/notificaciones.js).
//
//  Dos formas, se usa la primera que esté configurada:
//
//  1. API de Zoho Mail (por HTTPS). Es la que sirve en Render: el plan
//     gratis bloquea los puertos SMTP desde el 2026-09-26. Sale de la misma
//     cuenta de Zoho y queda en su carpeta de Enviados.
//       ZOHO_MAIL_CLIENT_ID      del "Self Client" en api-console.zoho.com
//       ZOHO_MAIL_CLIENT_SECRET  idem
//       ZOHO_MAIL_REFRESH_TOKEN  lo genera scripts/zoho-mail-autorizar.js
//       ZOHO_MAIL_ACCOUNT_ID     idem
//     La API no permite "Responder a" (reply-to): las respuestas llegan a
//     la cuenta que envía.
//
//  2. SMTP de Zoho (sirve en local):
//       SMTP_HOST     smtp.zoho.com   (o smtp.zoho.eu según la región)
//       SMTP_PORT     465
//       SMTP_USER     oscarrussi@russitex.com
//       SMTP_PASS     contraseña de aplicación de Zoho (NO la del correo)
//     La contraseña de aplicación se genera en Zoho:
//       Mi cuenta -> Seguridad -> Contraseñas de aplicación -> Generar
//
//  CORREO_REMITENTE: dirección que envía (la cuenta o un alias suyo).
//  CORREO_DESTINO:   a dónde llegan los avisos para la tienda.
// ============================================================
const nodemailer = require('nodemailer')

const ZOHO_CUENTAS = 'https://accounts.zoho.com'
const ZOHO_MAIL    = 'https://mail.zoho.com'

let transporte = null

const usaApiZoho = () => Boolean(
  process.env.ZOHO_MAIL_CLIENT_ID && process.env.ZOHO_MAIL_CLIENT_SECRET &&
  process.env.ZOHO_MAIL_REFRESH_TOKEN && process.env.ZOHO_MAIL_ACCOUNT_ID
)

function configurado() {
  return usaApiZoho() || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

// El remitente puede ser un ALIAS de la cuenta autenticada (Zoho lo
// permite), pero nunca una dirección ajena: eso sí lo rechaza.
const remitente = () => process.env.CORREO_REMITENTE || process.env.SMTP_USER

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
 * `responderA` solo aplica por SMTP (la API de Zoho no lo soporta).
 */
async function enviarCorreo({ asunto, texto, html, responderA, adjuntos = [], destino: destinoExplicito }) {
  const destino = destinoExplicito || process.env.CORREO_DESTINO || process.env.SMTP_USER
  if (!destino) throw new Error('No hay destinatario: falta CORREO_DESTINO en el .env')
  if (usaApiZoho()) {
    return enviarPorApiZoho({ destino, asunto, texto, html, adjuntos })
  }

  const info = await obtenerTransporte().sendMail({
    from: `"Russitex" <${remitente()}>`,
    to: destino,
    subject: asunto,
    text: texto,
    html,
    replyTo: responderA || undefined,
    attachments: adjuntos,
  })
  return info.messageId
}

// ------------------------------------------------------------
// API de Zoho Mail
// ------------------------------------------------------------

// El token de acceso dura 1 hora; se renueva con el refresh token y se
// guarda hasta un minuto antes de vencer.
let _token = { valor: null, vence: 0 }
async function tokenZoho() {
  if (_token.valor && Date.now() < _token.vence) return _token.valor
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_MAIL_REFRESH_TOKEN,
    client_id:     process.env.ZOHO_MAIL_CLIENT_ID,
    client_secret: process.env.ZOHO_MAIL_CLIENT_SECRET,
    grant_type:    'refresh_token',
  })
  const res = await fetch(`${ZOHO_CUENTAS}/oauth/v2/token?${params}`, { method: 'POST', signal: AbortSignal.timeout(15000) })
  const datos = await res.json().catch(() => ({}))
  if (!datos.access_token) throw new Error(`Zoho no entregó el token de acceso: ${datos.error || res.status}`)
  _token = { valor: datos.access_token, vence: Date.now() + ((datos.expires_in || 3600) - 60) * 1000 }
  return _token.valor
}

async function llamarZohoMail(ruta, opciones) {
  const res = await fetch(`${ZOHO_MAIL}/api/accounts/${process.env.ZOHO_MAIL_ACCOUNT_ID}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Zoho-oauthtoken ${await tokenZoho()}`, Accept: 'application/json', ...opciones.headers },
    signal: AbortSignal.timeout(20000),
  })
  const datos = await res.json().catch(() => ({}))
  if (!res.ok || (datos.status && datos.status.code >= 400)) {
    throw new Error(`Zoho Mail respondió ${res.status}: ${JSON.stringify(datos.data || datos.status || datos).slice(0, 300)}`)
  }
  return datos
}

// Los adjuntos se suben primero ("archivo crudo", uno por llamada) y el
// correo los referencia con lo que devuelve la subida.
async function subirAdjuntoZoho({ filename, content }) {
  const { data } = await llamarZohoMail(`/messages/attachments?fileName=${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: Buffer.isBuffer(content) ? content : Buffer.from(content),
  })
  const a = Array.isArray(data) ? data[0] : data
  return { storeName: a.storeName, attachmentPath: a.attachmentPath, attachmentName: a.attachmentName }
}

async function enviarPorApiZoho({ destino, asunto, texto, html, adjuntos }) {
  if (!remitente()) throw new Error('Falta CORREO_REMITENTE (o SMTP_USER): la dirección que envía')
  const attachments = []
  for (const adjunto of adjuntos) attachments.push(await subirAdjuntoZoho(adjunto))

  const { data } = await llamarZohoMail('/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Solo la dirección: el nombre que se muestra es el de la cuenta en Zoho.
      fromAddress: remitente(),
      toAddress:   destino,
      subject:     asunto,
      content:     html || texto,
      mailFormat:  html ? 'html' : 'plaintext',
      ...(attachments.length ? { attachments } : {}),
    }),
  })
  return data?.messageId || 'enviado'
}

// Comprueba la configuración sin enviar nada. Útil para diagnosticar cuando
// el envío falla.
async function verificarConexion() {
  if (usaApiZoho()) {
    await tokenZoho()
    return true
  }
  return obtenerTransporte().verify()
}

module.exports = { enviarCorreo, verificarConexion, configurado }
