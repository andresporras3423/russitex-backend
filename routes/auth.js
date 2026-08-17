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
const { comoEntra, nombreProveedor } = require('../services/usuarios')
const { enviarCorreo, configurado }  = require('../services/correo')
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

  // La RESPUESTA es siempre la misma, exista o no la cuenta: si dijera
  // "ese correo no está registrado", cualquiera podría averiguar quién
  // tiene cuenta probando correos.
  //
  // Lo que SÍ cambia es el correo que se envía, porque ese solo lo recibe
  // el dueño de la dirección. Si la cuenta entra con Google o Facebook no
  // tiene sentido mandarle un enlace para cambiar una contraseña que no
  // usa: se le explica con cuál botón entrar.
  const respuestaNeutra = { mensaje: 'Si el email existe, recibirás instrucciones en tu correo.' }

  try {
    const cuenta = await comoEntra(email)

    // Sin clave de administrador no podemos saber cómo entra; seguimos con
    // el flujo de contraseña de siempre.
    if (!cuenta) {
      console.log('[auth] recuperar: sin SUPABASE_SERVICE_KEY, se envía el enlace por defecto')
    } else if (!cuenta.existe) {
      console.log('[auth] recuperar: la cuenta no existe, no se envía nada')
      return res.json(respuestaNeutra)
    } else if (!cuenta.tieneContrasena) {
      console.log(`[auth] recuperar: cuenta social (${cuenta.proveedores.join(', ')}), se envía el aviso`)
      await avisarCuentaSocial(email, cuenta.proveedores)
      return res.json(respuestaNeutra)
    } else {
      console.log(`[auth] recuperar: cuenta con contraseña (${cuenta.proveedores.join(', ')}), se envía el enlace`)
    }
  } catch (e) {
    // Si falla la consulta seguimos con el flujo normal: es preferible
    // mandar el enlace de más que dejar al usuario sin poder entrar.
    console.error('[auth] No se pudo revisar cómo entra la cuenta:', e.message)
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/nueva-contrasena`
  })

  if (error) {
    console.error('[auth] Error enviando el enlace de recuperación:', error.message)
    return res.status(500).json({ error: 'Error enviando el email.' })
  }

  res.json(respuestaNeutra)
})

// Correo para cuentas que entran con Google o Facebook: no tienen
// contraseña que restablecer.
async function avisarCuentaSocial(email, proveedores) {
  if (!configurado()) {
    console.error('[auth] SMTP sin configurar: no se avisó a la cuenta social', email)
    return
  }

  const lista = proveedores.map(nombreProveedor).join(' o ')
  const loginUrl = `${process.env.FRONTEND_URL}/login`

  const texto =
    `Hola,\n\n` +
    `Pediste cambiar la contraseña de tu cuenta en Russitex, pero tu cuenta no usa contraseña: ` +
    `entra con ${lista}.\n\n` +
    `Para ingresar, ve a ${loginUrl} y usa el botón de ${lista}.\n\n` +
    `Si no fuiste vos quien pidió esto, podés ignorar este correo: tu cuenta sigue segura.\n\n` +
    `Russitex`

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#3B302A;max-width:520px;line-height:1.6">
      <h2 style="font-size:17px;margin:0 0 12px">Tu cuenta no usa contraseña</h2>
      <p style="font-size:14px;margin:0 0 14px">
        Pediste cambiar la contraseña de tu cuenta en Russitex, pero tu cuenta entra con
        <strong>${lista}</strong>, así que no hay ninguna contraseña que cambiar.
      </p>
      <p style="font-size:14px;margin:0 0 20px">
        Para ingresar, entra a Russitex y usa el botón de <strong>${lista}</strong>.
      </p>
      <p style="margin:0 0 22px">
        <a href="${loginUrl}" style="background:#2C5C7C;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block">
          Ir a iniciar sesión
        </a>
      </p>
      <p style="font-size:12px;color:#6E665C;margin:0">
        Si no fuiste vos quien pidió esto, podés ignorar este correo: tu cuenta sigue segura.
      </p>
    </div>`

  await enviarCorreo({
    asunto: 'Tu cuenta de Russitex entra con ' + lista,
    texto,
    html,
    destino: email,
  })
}


module.exports = router
