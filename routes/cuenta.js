// ============================================================
//  routes/cuenta.js  —  Mi cuenta: datos personales, contraseña y
//  direcciones guardadas.
//
//  Todo requiere sesión (verificarAuth) y trabaja SOLO sobre el usuario
//  que la inició.
//
//    GET    /api/cuenta/perfil
//    PUT    /api/cuenta/perfil                  { nombre, telefono, tipoDocumento, documento, empresa? }
//    POST   /api/cuenta/desde-checkout          (lo último escrito en el checkout)
//    POST   /api/cuenta/contrasena              { actual, nueva }
//    GET    /api/cuenta/direcciones
//    POST   /api/cuenta/direcciones             { destinatario, direccion, indicaciones?, codigoDane }
//    PUT    /api/cuenta/direcciones/:id         (mismos campos)
//    POST   /api/cuenta/direcciones/:id/principal
//    DELETE /api/cuenta/direcciones/:id
//
//  El nombre, teléfono y documento viven en el user_metadata de Supabase
//  Auth. El correo no se cambia aquí (exige verificar el nuevo y además
//  decide qué pedidos ve la cuenta).
// ============================================================
const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const router = express.Router()
const verificarAuth = require('../middleware/verificarAuth')
const { supabaseAdmin } = require('../database/supabaseAdmin')
const { proveedoresDe } = require('../services/usuarios')
const { municipios } = require('../data/municipios-co.json')

const MUNICIPIO = new Map(municipios.map((m) => [m.dane, m]))
const TIPOS_DOCUMENTO = ['CC', 'CE', 'TI', 'PP', 'NIT']
const MAX_DIRECCIONES = 10

router.use(verificarAuth)

const texto = (v, max) => String(v ?? '').trim().slice(0, max)

// ------------------------------------------------------------
// Perfil
// ------------------------------------------------------------
async function leerUsuario(id) {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(id)
  if (error || !data?.user) throw new Error(`No se pudo leer la cuenta: ${error?.message || 'no existe'}`)
  return data.user
}

function perfilDe(user) {
  const m = user.user_metadata || {}
  return {
    nombre:          m.full_name || m.name || '',
    email:           user.email,
    telefono:        m.telefono || '',
    tipoDocumento:   m.tipo_documento || 'CC',
    documento:       m.documento || '',
    proveedores:     proveedoresDe(user),           // ['email'], ['google'], ...
    tieneContrasena: proveedoresDe(user).includes('email'),
    // Datos de facturación de empresa y si la última compra fue como empresa
    // (así el checkout marca o no "Datos de empresa").
    empresa:             m.empresa || null,         // { razonSocial, nit, regimen }
    facturarComoEmpresa: Boolean(m.facturar_como_empresa && m.empresa),
  }
}

const REGIMENES = ['COMMON_REGIME', 'SIMPLIFIED_REGIME']

// Valida los datos de empresa. Devuelve { empresa } (null = sin empresa) o { error }.
function datosEmpresa(e) {
  if (e == null) return { empresa: null }
  const razonSocial = texto(e.razonSocial, 150)
  const nit = String(e.nit ?? '').replace(/\D/g, '').slice(0, 15)
  const regimen = REGIMENES.includes(e.regimen) ? e.regimen : ''
  if (razonSocial.length < 2) return { error: 'Escribe la razón social.' }
  if (nit.length < 5) return { error: 'El NIT no es válido.' }
  if (!regimen) return { error: 'Elige la responsabilidad de IVA.' }
  return { empresa: { razonSocial, nit, regimen } }
}

router.get('/perfil', async (req, res) => {
  try {
    res.json(perfilDe(await leerUsuario(req.usuario.id)))
  } catch (e) {
    console.error('[cuenta] perfil:', e.message)
    res.status(500).json({ error: 'No se pudo cargar tu información.' })
  }
})

router.put('/perfil', async (req, res) => {
  const nombre = texto(req.body?.nombre, 120)
  const telefono = texto(req.body?.telefono, 20)
  const tipoDocumento = texto(req.body?.tipoDocumento, 5).toUpperCase() || 'CC'
  const documento = texto(req.body?.documento, 20)

  if (nombre.length < 2) return res.status(400).json({ error: 'Escribe tu nombre completo.' })
  if (telefono && !/^\+?[\d\s()-]{7,20}$/.test(telefono)) return res.status(400).json({ error: 'El teléfono no es válido.' })
  if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) return res.status(400).json({ error: 'Tipo de documento no válido.' })
  if (documento && !/^[\w.-]{4,20}$/.test(documento)) return res.status(400).json({ error: 'El documento no es válido.' })
  // La empresa solo cambia si viene la clave (null = borrarla).
  const conEmpresa = req.body && 'empresa' in req.body
  const { empresa, error: errEmpresa } = conEmpresa ? datosEmpresa(req.body.empresa) : {}
  if (errEmpresa) return res.status(400).json({ error: errEmpresa })

  try {
    const user = await leerUsuario(req.usuario.id)
    const { data, error } = await supabaseAdmin().auth.admin.updateUserById(req.usuario.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: nombre,
        name: nombre,
        telefono,
        tipo_documento: tipoDocumento,
        documento,
        ...(conEmpresa ? { empresa, ...(empresa ? {} : { facturar_como_empresa: false }) } : {}),
      },
    })
    if (error) throw error
    res.json(perfilDe(data.user))
  } catch (e) {
    console.error('[cuenta] actualizar perfil:', e.message)
    res.status(500).json({ error: 'No se pudieron guardar los cambios.' })
  }
})

// ------------------------------------------------------------
// Contraseña: se confirma la actual antes de cambiarla.
// ------------------------------------------------------------
router.post('/contrasena', async (req, res) => {
  const actual = String(req.body?.actual || '')
  const nueva = String(req.body?.nueva || '')
  if (nueva.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  if (nueva === actual) return res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual.' })

  try {
    const user = await leerUsuario(req.usuario.id)
    if (!proveedoresDe(user).includes('email')) {
      return res.status(400).json({ error: 'Tu cuenta entra con Google o Facebook: no tiene contraseña propia.' })
    }
    // Cliente aparte, sin guardar sesión: solo para comprobar la actual.
    const verificador = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: errLogin } = await verificador.auth.signInWithPassword({ email: user.email, password: actual })
    if (errLogin) return res.status(400).json({ error: 'La contraseña actual no es correcta.' })

    const { error } = await supabaseAdmin().auth.admin.updateUserById(req.usuario.id, { password: nueva })
    if (error) throw error
    res.json({ ok: true })
  } catch (e) {
    console.error('[cuenta] cambiar contraseña:', e.message)
    res.status(500).json({ error: 'No se pudo cambiar la contraseña.' })
  }
})

// ------------------------------------------------------------
// Direcciones
// ------------------------------------------------------------
const aDireccion = (f) => ({
  id: f.id,
  destinatario: f.destinatario,
  direccion: f.direccion,
  indicaciones: f.indicaciones || '',
  codigoDane: f.codigo_dane,
  ciudad: f.ciudad,
  departamento: f.departamento,
  principal: f.principal,
})

async function listarDirecciones(usuarioId) {
  const { data, error } = await supabaseAdmin()
    .from('direcciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('principal', { ascending: false })
    .order('creado_en', { ascending: true })
  if (error) throw new Error(error.message)
  return data.map(aDireccion)
}

// Valida el cuerpo y devuelve las columnas, o { error }.
function datosDireccion(body) {
  const destinatario = texto(body?.destinatario, 120)
  const direccion = texto(body?.direccion, 200)
  const indicaciones = texto(body?.indicaciones, 200)
  const m = MUNICIPIO.get(String(body?.codigoDane || ''))
  if (destinatario.length < 2) return { error: 'Escribe el nombre de quien recibe.' }
  if (direccion.length < 5) return { error: 'Escribe la dirección completa.' }
  if (!m) return { error: 'Elige el departamento y el municipio.' }
  return {
    destinatario, direccion, indicaciones: indicaciones || null,
    codigo_dane: m.dane, ciudad: m.ciudad, departamento: m.departamento,
  }
}

// Deja `id` como la única principal de la cuenta (primero se quita la
// anterior: el índice único no permite dos a la vez).
async function hacerPrincipal(usuarioId, id) {
  const db = supabaseAdmin()
  const q1 = await db.from('direcciones').update({ principal: false }).eq('usuario_id', usuarioId).eq('principal', true).neq('id', id)
  if (q1.error) throw new Error(q1.error.message)
  const q2 = await db.from('direcciones').update({ principal: true, actualizado_en: new Date().toISOString() })
    .eq('usuario_id', usuarioId).eq('id', id).select('id')
  if (q2.error) throw new Error(q2.error.message)
  return q2.data.length > 0
}

const responderLista = async (req, res) => res.json({ direcciones: await listarDirecciones(req.usuario.id) })

router.get('/direcciones', async (req, res) => {
  try { await responderLista(req, res) } catch (e) {
    console.error('[cuenta] direcciones:', e.message)
    res.status(500).json({ error: 'No se pudieron cargar tus direcciones.' })
  }
})

router.post('/direcciones', async (req, res) => {
  const datos = datosDireccion(req.body)
  if (datos.error) return res.status(400).json(datos)
  try {
    const actuales = await listarDirecciones(req.usuario.id)
    if (actuales.length >= MAX_DIRECCIONES) return res.status(400).json({ error: `Puedes guardar hasta ${MAX_DIRECCIONES} direcciones.` })

    const { data, error } = await supabaseAdmin().from('direcciones')
      .insert({ ...datos, usuario_id: req.usuario.id, principal: false }).select('id').single()
    if (error) throw new Error(error.message)
    // La primera queda como principal.
    if (actuales.length === 0) await hacerPrincipal(req.usuario.id, data.id)
    await responderLista(req, res)
  } catch (e) {
    console.error('[cuenta] agregar dirección:', e.message)
    res.status(500).json({ error: 'No se pudo guardar la dirección.' })
  }
})

router.put('/direcciones/:id', async (req, res) => {
  const datos = datosDireccion(req.body)
  if (datos.error) return res.status(400).json(datos)
  try {
    const { data, error } = await supabaseAdmin().from('direcciones')
      .update({ ...datos, actualizado_en: new Date().toISOString() })
      .eq('usuario_id', req.usuario.id).eq('id', req.params.id).select('id')
    if (error) throw new Error(error.message)
    if (!data.length) return res.status(404).json({ error: 'Esa dirección no existe.' })
    await responderLista(req, res)
  } catch (e) {
    console.error('[cuenta] editar dirección:', e.message)
    res.status(500).json({ error: 'No se pudo guardar la dirección.' })
  }
})

router.post('/direcciones/:id/principal', async (req, res) => {
  try {
    if (!(await hacerPrincipal(req.usuario.id, req.params.id))) return res.status(404).json({ error: 'Esa dirección no existe.' })
    await responderLista(req, res)
  } catch (e) {
    console.error('[cuenta] dirección principal:', e.message)
    res.status(500).json({ error: 'No se pudo cambiar la dirección principal.' })
  }
})

// ------------------------------------------------------------
// POST /api/cuenta/desde-checkout
//
// El checkout lo llama al hacer clic en "Pagar" para que la próxima compra
// salga prellenada. Guarda lo último que escribió el cliente:
//   - datos personales (los vacíos no borran lo que ya había),
//   - la empresa y si esta vez compró como empresa,
//   - la dirección, AGREGÁNDOLA a "Mis direcciones" si no estaba
//     (la primera queda como principal; nunca reemplaza ni borra otras).
// Body: { nombre, telefono, tipoDocumento, documento, empresa|null,
//         direccion?: { destinatario, direccion, codigoDane } }
// Nunca falla hacia el cliente por un dato raro: lo inválido se ignora.
// ------------------------------------------------------------
const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

router.post('/desde-checkout', async (req, res) => {
  const b = req.body || {}
  try {
    const user = await leerUsuario(req.usuario.id)
    const m = { ...(user.user_metadata || {}) }

    const nombre = texto(b.nombre, 120)
    const telefono = texto(b.telefono, 20)
    const tipoDocumento = texto(b.tipoDocumento, 5).toUpperCase()
    const documento = texto(b.documento, 20)
    if (nombre.length >= 2) { m.full_name = nombre; m.name = nombre }
    if (/^\+?[\d\s()-]{7,20}$/.test(telefono)) m.telefono = telefono
    if (/^[\w.-]{4,20}$/.test(documento) && TIPOS_DOCUMENTO.includes(tipoDocumento)) {
      m.tipo_documento = tipoDocumento
      m.documento = documento
    }
    // Sin empresa esta vez: se conserva la guardada, solo se desmarca.
    const { empresa } = datosEmpresa(b.empresa)
    if (empresa) m.empresa = empresa
    m.facturar_como_empresa = Boolean(empresa)

    const { error } = await supabaseAdmin().auth.admin.updateUserById(req.usuario.id, { user_metadata: m })
    if (error) throw error

    let direccionGuardada = false
    if (b.direccion) {
      const datos = datosDireccion(b.direccion)
      if (!datos.error) {
        const actuales = await listarDirecciones(req.usuario.id)
        // Misma dirección = mismo municipio y mismo texto (con o sin indicaciones).
        const clave = normalizar(datos.direccion)
        const yaEsta = actuales.some((d) => d.codigoDane === datos.codigo_dane &&
          [d.direccion, `${d.direccion} (${d.indicaciones})`, `${d.direccion} ${d.indicaciones}`].some((t) => normalizar(t) === clave))
        if (!yaEsta && actuales.length < MAX_DIRECCIONES) {
          const { data, error: errDir } = await supabaseAdmin().from('direcciones')
            .insert({ ...datos, usuario_id: req.usuario.id, principal: false }).select('id').single()
          if (errDir) throw new Error(errDir.message)
          if (actuales.length === 0) await hacerPrincipal(req.usuario.id, data.id)
          direccionGuardada = true
        }
      }
    }
    res.json({ ok: true, direccionGuardada })
  } catch (e) {
    console.error('[cuenta] guardar desde checkout:', e.message)
    res.status(500).json({ error: 'No se pudieron guardar tus datos.' })
  }
})

router.delete('/direcciones/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin().from('direcciones')
      .delete().eq('usuario_id', req.usuario.id).eq('id', req.params.id).select('principal')
    if (error) throw new Error(error.message)
    if (!data.length) return res.status(404).json({ error: 'Esa dirección no existe.' })
    // Si se borró la principal, pasa a serlo la más antigua que quede.
    if (data[0].principal) {
      const resto = await listarDirecciones(req.usuario.id)
      if (resto.length) await hacerPrincipal(req.usuario.id, resto[0].id)
    }
    await responderLista(req, res)
  } catch (e) {
    console.error('[cuenta] eliminar dirección:', e.message)
    res.status(500).json({ error: 'No se pudo eliminar la dirección.' })
  }
})

module.exports = router
