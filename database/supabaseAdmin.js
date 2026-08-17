// ============================================================
//  database/supabaseAdmin.js
//
//  Cliente de Supabase con la clave `service_role`.
//
//  OJO: esta clave SALTA todas las políticas de RLS y puede leer y
//  escribir cualquier tabla, además de administrar usuarios. Por eso:
//    - vive solo en el .env del backend (que está en .gitignore)
//    - NUNCA se manda al frontend ni se expone en una respuesta
//    - se usa solo donde de verdad hace falta
//
//  Se saca de: Supabase -> Project Settings -> API -> service_role
// ============================================================
const { createClient } = require('@supabase/supabase-js')

let cliente = null

function hayClaveAdmin() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
}

function supabaseAdmin() {
  if (!hayClaveAdmin()) {
    throw new Error('Falta SUPABASE_SERVICE_KEY en el archivo .env')
  }
  if (!cliente) {
    cliente = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return cliente
}

module.exports = { supabaseAdmin, hayClaveAdmin }
