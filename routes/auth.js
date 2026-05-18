// ============================================================
//  routes/auth.js
//
//  Endpoints relacionados con autenticación.
//
//  IMPORTANTE: El login real (Google, Facebook, email) lo maneja
//  Supabase directamente desde el frontend con su SDK.
//  Este archivo maneja lo que ocurre DESPUÉS del login:
//  - Obtener el perfil del usuario
//  - Guardar datos extra del usuario en tu BD
//  - Cerrar sesión desde el backend
// ============================================================
const express       = require('express')
const router        = express.Router()
const verificarAuth = require('../middleware/verificarAuth')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)


// ------------------------------------------------------------
// GET /api/auth/perfil
//
// Devuelve los datos del usuario autenticado.
// El frontend llama esto justo después del login para
// saber quién está logueado.
//
// Requiere: header Authorization: Bearer <token>
// ------------------------------------------------------------
router.get('/perfil', verificarAuth, async (req, res) => {
  // req.usuario ya viene del middleware verificarAuth
  res.json({
    id:        req.usuario.id,
    email:     req.usuario.email,
    nombre:    req.usuario.nombre,
    avatar:    req.usuario.avatar,
    proveedor: req.usuario.proveedor  // 'google', 'facebook', 'email'
  })
})


// ------------------------------------------------------------
// POST /api/auth/registro
//
// Registro con email y contraseña.
// Para Google y Facebook el registro es automático desde
// el frontend con Supabase SDK, no pasa por aquí.
//
// Body: { email, contraseña, nombre }
// ------------------------------------------------------------
router.post('/registro', async (req, res) => {
  const { email, contrasena, nombre } = req.body

  if (!email || !contrasena || !nombre) {
    return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos.' })
  }

  if (contrasena.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: contrasena,
    options: {
      data: { full_name: nombre },           // se guarda en user_metadata
      emailRedirectTo: `${process.env.FRONTEND_URL}/login`  // URL de confirmación
    }
  })

  if (error) {
    // Supabase devuelve mensajes en inglés, los traducimos
    const mensajes = {
      'User already registered': 'Este email ya está registrado.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.'
    }
    return res.status(400).json({ error: mensajes[error.message] || error.message })
  }

  res.status(201).json({
    mensaje: 'Cuenta creada. Revisa tu email para confirmar el registro.',
    usuario: { id: data.user.id, email: data.user.email }
  })
})


// ------------------------------------------------------------
// POST /api/auth/login
//
// Login con email y contraseña.
// Devuelve el token JWT que el frontend debe guardar
// y enviar en cada request posterior.
//
// Body: { email, contrasena }
// ------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, contrasena } = req.body

  if (!email || !contrasena) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: contrasena
  })

  if (error) {
    const mensajes = {
      'Invalid login credentials': 'Email o contraseña incorrectos.',
      'Email not confirmed': 'Debes confirmar tu email antes de iniciar sesión.'
    }
    return res.status(401).json({ error: mensajes[error.message] || error.message })
  }

  res.json({
    token:   data.session.access_token,   // el frontend guarda esto
    refresh: data.session.refresh_token,  // para renovar la sesión
    usuario: {
      id:     data.user.id,
      email:  data.user.email,
      nombre: data.user.user_metadata?.full_name
    }
  })
})


// ------------------------------------------------------------
// POST /api/auth/logout
//
// Cierra la sesión del usuario.
// Invalida el token en Supabase.
//
// Requiere: header Authorization: Bearer <token>
// ------------------------------------------------------------
router.post('/logout', verificarAuth, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1]

  const { error } = await supabase.auth.admin.signOut(token)

  if (error) {
    return res.status(500).json({ error: 'Error cerrando sesión.' })
  }

  res.json({ mensaje: 'Sesión cerrada correctamente.' })
})


// ------------------------------------------------------------
// POST /api/auth/recuperar-contrasena
//
// Envía un email para restablecer la contraseña.
// Supabase envía el email automáticamente.
//
// Body: { email }
// ------------------------------------------------------------
router.post('/recuperar-contrasena', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email requerido.' })
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/nueva-contrasena`
  })

  if (error) {
    return res.status(500).json({ error: 'Error enviando el email.' })
  }

  // Siempre respondemos lo mismo por seguridad
  // (para no revelar si el email existe o no)
  res.json({ mensaje: 'Si el email existe, recibirás instrucciones en tu correo.' })
})


module.exports = router
