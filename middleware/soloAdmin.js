// ============================================================
//  middleware/soloAdmin.js  —  Rutas del panel de administrador
//
//  Va DESPUÉS de verificarAuth. Solo pasan las cuentas cuyo correo está en
//  ADMIN_EMAILS (separados por coma) y que tienen el correo confirmado.
//  Esconder la pestaña en la web no protege nada: esto sí.
// ============================================================
function correosAdmin() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
}

function esAdmin(email) {
  return Boolean(email) && correosAdmin().includes(String(email).toLowerCase())
}

function soloAdmin(req, res, next) {
  if (!req.usuario?.emailConfirmado || !esAdmin(req.usuario.email)) {
    return res.status(403).json({ error: 'Esta sección es solo para administradores.' })
  }
  next()
}

module.exports = soloAdmin
module.exports.esAdmin = esAdmin
