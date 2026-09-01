// ============================================================
//  services/avisos.js
//
//  "Avísame cuando esté disponible".
//
//  Dos operaciones:
//    guardarAviso()     — alguien deja su correo desde la ficha
//    enviarPendientes() — se manda lo que ya corresponde mandar
//
//  ── POR QUÉ enviarPendientes() NO NECESITA UN DISPARADOR ──
//
//  Lo natural sería reaccionar al instante en que un producto vuelve a
//  estar disponible. Pero hoy ese cambio lo hace una persona editando
//  una fila en el panel de Supabase, y ahí no corre código nuestro.
//
//  Así que no se detecta el cambio: se pregunta por el estado actual.
//  La rutina mira todos los avisos pendientes y se queda con los que
//  apuntan a algo que YA está disponible. Si el producto volvió mientras
//  nadie miraba, el aviso sigue pendiente y sale en la próxima pasada.
//
//  La consecuencia buena es que da igual quién la llame:
//    - la pantalla de administración, al marcar disponible
//    - un Database Webhook de Supabase, cuando el backend esté desplegado
//      (Postgres no habla SMTP: el webhook llama acá, no manda el correo)
//    - scripts/enviar-avisos.js, a mano
//
//  Ninguna de esas opciones descarta a las otras, y agregar el webhook
//  más adelante no obliga a reescribir nada de acá.
// ============================================================
const { supabaseAdmin, hayClaveAdmin } = require('../database/supabaseAdmin')
const { obtenerCatalogo } = require('./catalogo')
const { enviarCorreo, configurado } = require('./correo')

const TABLA = 'avisos_disponibilidad'
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const WEB = process.env.SITIO_URL || 'https://russitex.com'


/**
 * Guarda un pedido de aviso.
 *
 * Devuelve { ok, repetido }. `repetido` es true cuando esa persona ya
 * estaba anotada para lo mismo: no es un error, al cliente se le dice
 * que quedó anotado igual (que es la verdad).
 */
async function guardarAviso({ correo, alegraId, varianteId = null, usuarioId = null }) {
  if (!CORREO_VALIDO.test(String(correo || ''))) {
    throw Object.assign(new Error('El correo electrónico no es válido.'), { publico: true })
  }

  const fila = {
    correo: String(correo).trim().slice(0, 160),
    alegra_id: String(alegraId),
    variante_id: varianteId != null ? Number(varianteId) : null,
    usuario_id: usuarioId || null,
  }

  const { error } = await supabaseAdmin().from(TABLA).insert(fila)

  if (error) {
    // 23505 = choca con el índice único de pendientes. Ya estaba anotado.
    if (error.code === '23505') return { ok: true, repetido: true }
    // 23503 = la clave foránea no existe. Producto o variante inventados.
    if (error.code === '23503') {
      throw Object.assign(new Error('Ese producto no existe.'), { publico: true })
    }
    throw new Error(`No se pudo guardar el aviso: ${error.message}`)
  }

  return { ok: true, repetido: false }
}


// ------------------------------------------------------------
//  Envío
// ------------------------------------------------------------

function armarCorreo({ nombreProducto, nombreVariante, enlace }) {
  const queEs = nombreVariante ? `${nombreProducto} (${nombreVariante})` : nombreProducto

  const texto = [
    `${queEs} ya está disponible otra vez.`,
    '',
    'Nos dejaste tu correo para que te avisáramos, así que acá está el aviso.',
    '',
    `Verlo en la tienda: ${enlace}`,
    '',
    '—',
    'Russitex — materiales de confección desde 1987, Bogotá.',
    'Recibiste este correo porque lo pediste en la ficha del producto.',
    'Es un aviso único: no quedaste en ninguna lista de correos.',
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#3B302A;max-width:560px">
      <p style="font-size:13px;color:#6E665C;margin:0 0 6px">Volvió a la tienda</p>
      <h2 style="font-size:20px;margin:0 0 14px">${escaparHtml(queEs)} ya está disponible</h2>
      <p style="font-size:14px;line-height:1.55;margin:0 0 22px">
        Nos dejaste tu correo para que te avisáramos cuando volviera. Acá está el aviso.
      </p>
      <p style="margin:0 0 26px">
        <a href="${escaparHtml(enlace)}"
           style="display:inline-block;background:#8C5A3C;color:#fff;text-decoration:none;
                  padding:12px 22px;border-radius:6px;font-size:14px;font-weight:600">
          Ver el producto
        </a>
      </p>
      <p style="font-size:12px;color:#6E665C;line-height:1.55;margin:0;
                border-top:1px solid #E0D8CB;padding-top:14px">
        Russitex — materiales de confección desde 1987, Bogotá.<br>
        Recibiste este correo porque lo pediste en la ficha del producto.
        Es un aviso único: no quedaste en ninguna lista de correos.
      </p>
    </div>`

  return { texto, html }
}

function escaparHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}


/**
 * Manda los avisos que correspondan y marca las filas como avisadas.
 *
 * Opciones:
 *   alegraId  limita a un producto (lo que usará la pantalla de
 *             administración: acaban de marcar ESE como disponible).
 *             Sin él, revisa todo.
 *   simular   arma todo y cuenta, pero no manda ni marca nada.
 *
 * Devuelve { revisados, enviados, fallidos, detalle }.
 */
async function enviarPendientes({ alegraId = null, simular = false } = {}) {
  if (!hayClaveAdmin()) {
    throw new Error('Falta SUPABASE_SERVICE_KEY en el .env: no se puede leer la tabla de avisos.')
  }
  if (!simular && !configurado()) {
    throw new Error('Falta la configuración de SMTP en el .env: no se pueden mandar los correos.')
  }

  let consulta = supabaseAdmin().from(TABLA).select('*').is('avisado_en', null)
  if (alegraId) consulta = consulta.eq('alegra_id', String(alegraId))

  const { data: pendientes, error } = await consulta
  if (error) throw new Error(`No se pudo leer la tabla de avisos: ${error.message}`)
  if (!pendientes || pendientes.length === 0) {
    return { revisados: 0, enviados: 0, fallidos: 0, detalle: [] }
  }

  // `forzar` es obligatorio: la caché del catálogo dura 24 horas, así que
  // sin esto la rutina podría creer que algo sigue agotado cuando ya volvió.
  const { productos } = await obtenerCatalogo({ forzar: true })
  const porId = new Map(productos.map((p) => [String(p.id), p]))

  const detalle = []
  const avisadas = []

  for (const aviso of pendientes) {
    const producto = porId.get(String(aviso.alegra_id))

    // El producto ya no está en el catálogo (lo quitaron de Alegra).
    // Se deja pendiente: si vuelve, el aviso sigue vivo.
    if (!producto) {
      detalle.push({ id: aviso.id, estado: 'sin-producto' })
      continue
    }

    let nombreVariante = null
    let disponible

    if (aviso.variante_id == null) {
      // Pidió el producto en general. Con que haya vuelto UNA variante
      // basta: no eligió ninguna en particular. Eso es justo lo que ya
      // significa `producto.disponible` en el catálogo.
      disponible = producto.disponible
    } else {
      const variante = (producto.variantes || []).find((v) => String(v.id) === String(aviso.variante_id))
      if (!variante) {
        // Borraron la variante. Sin ella no hay nada que avisar.
        detalle.push({ id: aviso.id, estado: 'sin-variante' })
        continue
      }
      nombreVariante = variante.nombre
      // Las dos condiciones: no sirve que vuelva el color si el producto
      // entero sigue marcado como agotado.
      disponible = producto.disponible && variante.disponible
    }

    if (!disponible) {
      detalle.push({ id: aviso.id, estado: 'sigue-agotado' })
      continue
    }

    if (simular) {
      detalle.push({ id: aviso.id, estado: 'se-enviaria', correo: aviso.correo, producto: producto.nombre })
      continue
    }

    const { texto, html } = armarCorreo({
      nombreProducto: producto.nombre,
      nombreVariante,
      enlace: `${WEB}/producto/${producto.id}`,
    })

    try {
      await enviarCorreo({
        asunto: `${producto.nombre} ya está disponible`,
        texto,
        html,
        destino: aviso.correo,
      })
      // Solo se marca si el envío salió bien: si falla, la fila queda
      // pendiente y el próximo intento lo vuelve a probar.
      avisadas.push(aviso.id)
      detalle.push({ id: aviso.id, estado: 'enviado', correo: aviso.correo })
    } catch (e) {
      console.error(`[avisos] Falló el envío a ${aviso.correo}:`, e.message)
      detalle.push({ id: aviso.id, estado: 'fallo', correo: aviso.correo, error: e.message })
    }
  }

  if (avisadas.length > 0) {
    const { error: errorMarca } = await supabaseAdmin()
      .from(TABLA)
      .update({ avisado_en: new Date().toISOString() })
      .in('id', avisadas)

    // Grave y hay que verlo: los correos ya salieron. Si no se marcan,
    // la próxima pasada los manda otra vez.
    if (errorMarca) {
      console.error('[avisos] CORREOS ENVIADOS PERO NO MARCADOS. Ids:', avisadas.join(', '))
      console.error('[avisos] Motivo:', errorMarca.message)
    }
  }

  return {
    revisados: pendientes.length,
    enviados: detalle.filter((d) => d.estado === 'enviado').length,
    fallidos: detalle.filter((d) => d.estado === 'fallo').length,
    detalle,
  }
}


module.exports = { guardarAviso, enviarPendientes }
