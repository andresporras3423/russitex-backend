// ============================================================
//  services/usuarios.js
//
//  Consultas sobre las cuentas de Supabase que necesitan la clave
//  de administrador. Hoy solo la usa el flujo de "olvidé mi contraseña",
//  para saber si la cuenta entra con contraseña o con Google/Facebook.
// ============================================================
const { supabaseAdmin, hayClaveAdmin } = require('../database/supabaseAdmin')

// Cuántas cuentas revisamos como máximo al buscar por correo.
// La API de administración no permite filtrar por email, así que toca
// paginar. Con 5 páginas de 1000 cubrimos 5000 cuentas, de sobra para
// Russitex; si algún día crece, conviene guardar el proveedor en una
// tabla propia al registrarse en vez de recorrer la lista.
const POR_PAGINA = 1000
const MAX_PAGINAS = 5

/**
 * Saca la lista de proveedores de una cuenta.
 *
 * OJO: `identities` viene en null en la API de administración (comprobado
 * el 2026-08-17 con supabase-js 2.105), así que la fuente buena es
 * `app_metadata.providers`. Se miran las tres por si cambia:
 *   app_metadata: { provider: 'google', providers: ['google'] }
 */
function proveedoresDe(usuario) {
  const meta = usuario.app_metadata || {}
  if (Array.isArray(meta.providers) && meta.providers.length > 0) return meta.providers
  if (Array.isArray(usuario.identities) && usuario.identities.length > 0) {
    return usuario.identities.map((i) => i.provider)
  }
  return meta.provider ? [meta.provider] : []
}

/**
 * Busca una cuenta por correo y devuelve cómo entra.
 *
 *   { existe: false }
 *   { existe: true, tieneContrasena: true,  proveedores: ['email'] }
 *   { existe: true, tieneContrasena: false, proveedores: ['google'] }
 *
 * Si no hay clave de administrador devuelve `null`: quien llame decide
 * qué hacer (hoy, seguir con el flujo normal de contraseña).
 */
async function comoEntra(email) {
  if (!hayClaveAdmin()) return null

  const buscado = String(email).trim().toLowerCase()
  const admin = supabaseAdmin()

  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: POR_PAGINA })
    if (error) throw error

    const usuarios = data?.users || []
    const encontrado = usuarios.find((u) => (u.email || '').toLowerCase() === buscado)

    if (encontrado) {
      const proveedores = proveedoresDe(encontrado)
      return {
        existe: true,
        proveedores,
        // 'email' es el proveedor que Supabase asigna cuando hay contraseña.
        // Si por lo que sea no logramos leer ninguno, asumimos que SÍ tiene:
        // mandar un enlace de más es mucho menos grave que dejar a alguien
        // sin poder recuperar su cuenta.
        tieneContrasena: proveedores.length === 0 || proveedores.includes('email'),
      }
    }

    if (usuarios.length < POR_PAGINA) break   // última página
  }

  return { existe: false }
}

// Para el texto del correo: 'google' -> 'Google'
const NOMBRES = { google: 'Google', facebook: 'Facebook', email: 'correo y contraseña' }

function nombreProveedor(p) {
  return NOMBRES[p] || p
}

module.exports = { comoEntra, nombreProveedor }
