// ============================================================
//  middleware/verificarAuth.js
//
//  Este middleware protege los endpoints que requieren login.
//  El frontend envía el token JWT de Supabase en cada request,
//  y este middleware verifica que sea válido.
//
//  Uso:
//  router.get('/mis-pedidos', verificarAuth, (req, res) => { ... })
// ============================================================
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

async function verificarAuth(req, res, next) {
  // El frontend envía el token en el header Authorization
  // Formato: "Bearer eyJhbGciOiJIUzI1NiIs..."
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Token requerido.' })
  }

  const token = authHeader.split(' ')[1]

  // Supabase verifica el token y devuelve el usuario
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado.' })
  }

  // Adjuntamos el usuario al request para usarlo en los endpoints
  // Así cualquier endpoint protegido puede acceder a req.usuario
  req.usuario = {
    id:     user.id,
    email:  user.email,
    nombre: user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatar: user.user_metadata?.avatar_url || null,
    proveedor: user.app_metadata?.provider  // 'google', 'facebook', 'email'
  }

  next()
}

module.exports = verificarAuth
