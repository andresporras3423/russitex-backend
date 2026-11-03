// ============================================================
//  services/mercadolibreApi.js  —  Llamadas a la API de Mercado Libre
//
//  El token vive en la tabla ml_tokens (fila id = 1). Dura 6 horas y se
//  renueva con el refresh_token, que Mercado Libre CAMBIA en cada uso:
//  si dos renovaciones corren a la vez, la segunda usa un refresh ya
//  gastado y la conexión se pierde (habría que volver a autorizar).
//  Por eso la renovación es una sola promesa compartida.
// ============================================================
const { getTokensFromDB, upsert } = require('../database/supabase')

const API = 'https://api.mercadolibre.com'
const MARGEN_MS = 5 * 60 * 1000   // renueva 5 minutos antes de que venza

let renovando = null

async function renovar(refresh_token) {
  const r = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token,
    }),
  })
  const t = await r.json()
  if (!r.ok || !t.access_token) throw new Error(`Mercado Libre no renovó el token: ${t.message || r.status}`)
  await upsert('ml_tokens', {
    id: 1,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: Date.now() + t.expires_in * 1000,
  }, 'No se guardó el token renovado de Mercado Libre')
  return t.access_token
}

async function token() {
  const { access_token, refresh_token, expires_at } = await getTokensFromDB()
  if (Date.now() < expires_at - MARGEN_MS) return access_token
  if (!renovando) renovando = renovar(refresh_token).finally(() => { renovando = null })
  return renovando
}

// GET/POST/PUT a la API. `body` puede ser un objeto (va como JSON) o un FormData.
async function ml(ruta, { method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${await token()}` }
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const r = await fetch(API + ruta, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  const datos = await r.json().catch(() => null)
  if (!r.ok) {
    const err = new Error(`Mercado Libre ${method} ${ruta} respondió ${r.status}: ${datos?.message || ''}`)
    err.status = r.status
    err.datos = datos
    throw err
  }
  return datos
}

module.exports = { ml, token }
