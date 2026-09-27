// ============================================================
//  scripts/zoho-mail-autorizar.js
//
//  Configura la API de Zoho Mail (services/correo.js) una sola vez.
//
//  Antes, en https://api-console.zoho.com:
//    1. "Self Client" -> copiar Client ID y Client Secret al .env como
//       ZOHO_MAIL_CLIENT_ID y ZOHO_MAIL_CLIENT_SECRET.
//    2. Pestaña "Generate Code", scope:
//         ZohoMail.messages.CREATE,ZohoMail.accounts.READ
//       duración 10 minutos -> copiar el código al .env como
//       ZOHO_MAIL_CODIGO.
//
//  Luego, antes de que venza el código:
//    node scripts/zoho-mail-autorizar.js
//
//  Cambia el código por un refresh token (permanente), busca el id de la
//  cuenta y guarda ZOHO_MAIL_REFRESH_TOKEN y ZOHO_MAIL_ACCOUNT_ID en el
//  .env. No imprime ningún secreto. Después se borra ZOHO_MAIL_CODIGO (ya
//  no sirve: es de un solo uso).
// ============================================================
require('dotenv').config({ quiet: true })

const fs = require('fs')
const path = require('path')

const ENV_PATH = path.join(__dirname, '..', '.env')
const ZOHO_CUENTAS = 'https://accounts.zoho.com'
const ZOHO_MAIL = 'https://mail.zoho.com'

function guardarEnEnv(cambios) {
  let lineas = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
  for (const [clave, valor] of Object.entries(cambios)) {
    const i = lineas.findIndex((l) => l.startsWith(`${clave}=`))
    if (valor === null) {
      if (i >= 0) lineas.splice(i, 1)
    } else if (i >= 0) {
      lineas[i] = `${clave}=${valor}`
    } else {
      if (lineas.length && lineas[lineas.length - 1] === '') lineas.pop()
      lineas.push(`${clave}=${valor}`, '')
    }
  }
  fs.writeFileSync(ENV_PATH, lineas.join('\n'))
}

async function main() {
  const { ZOHO_MAIL_CLIENT_ID: id, ZOHO_MAIL_CLIENT_SECRET: secreto, ZOHO_MAIL_CODIGO: codigo } = process.env
  const faltan = [['ZOHO_MAIL_CLIENT_ID', id], ['ZOHO_MAIL_CLIENT_SECRET', secreto], ['ZOHO_MAIL_CODIGO', codigo]]
    .filter(([, v]) => !v).map(([k]) => k)
  if (faltan.length) {
    console.log(`Faltan en el .env: ${faltan.join(', ')}`)
    return
  }

  // 1. Código -> refresh token
  const params = new URLSearchParams({ code: codigo.trim(), client_id: id.trim(), client_secret: secreto.trim(), grant_type: 'authorization_code' })
  const r = await fetch(`${ZOHO_CUENTAS}/oauth/v2/token?${params}`, { method: 'POST' })
  const t = await r.json().catch(() => ({}))
  if (!t.refresh_token) {
    console.log(`Zoho no entregó el refresh token: ${t.error || r.status}`)
    if (t.error === 'invalid_code') console.log('El código venció o ya se usó: genera uno nuevo en api-console.zoho.com y vuelve a correr el script.')
    if (t.api_domain && !t.api_domain.includes('zoho.com')) console.log(`Tu cuenta es de otro centro de datos (${t.api_domain}): hay que ajustar las URLs.`)
    return
  }
  if (!String(t.scope || '').includes('ZohoMail.messages')) {
    console.log(`Ojo: el permiso concedido fue "${t.scope}". Hace falta ZohoMail.messages.CREATE.`)
  }

  // 2. Id de la cuenta de correo (la API de envío lo pide en la URL)
  const c = await fetch(`${ZOHO_MAIL}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${t.access_token}` } })
  const cuentas = (await c.json().catch(() => ({}))).data || []
  if (!cuentas.length) {
    console.log(`No se pudo leer la cuenta de correo (HTTP ${c.status}). ¿El scope incluye ZohoMail.accounts.READ?`)
    return
  }
  const cuenta = cuentas.find((x) => x.primaryEmailAddress === process.env.SMTP_USER) || cuentas[0]

  guardarEnEnv({
    ZOHO_MAIL_REFRESH_TOKEN: t.refresh_token,
    ZOHO_MAIL_ACCOUNT_ID: cuenta.accountId,
    ZOHO_MAIL_CODIGO: null,
  })
  console.log(`✅ Listo. Cuenta: ${cuenta.primaryEmailAddress} (${cuentas.length} en total).`)
  console.log('   Guardados en .env: ZOHO_MAIL_REFRESH_TOKEN y ZOHO_MAIL_ACCOUNT_ID (no se muestran).')
  console.log('   Copia a Render: ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET, ZOHO_MAIL_REFRESH_TOKEN, ZOHO_MAIL_ACCOUNT_ID.')
}

main().catch((e) => console.error('Error:', e.message))
