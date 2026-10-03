// ============================================================
//  services/notificaciones.js  —  Correos al cliente sobre su pedido
//
//    - avisarPedidoAprobado(pedido): al aprobarse el pago. Lleva el
//      resumen de la compra y, si ya hay guía, el número y el rastreo.
//    - avisarNovedadAlmacen(pedido, estado): a la tienda (no al cliente)
//      cuando el envío tiene un problema, para que lo llamen.
//
//  Los avisos de avance del envío (en camino, entregado...) al cliente los
//  manda Envia por su cuenta, con la marca de la tienda; aquí no se repiten.
//
//  Usan services/correo.js (Resend o SMTP). Si el correo falla NO se lanza el
//  error: un correo que no sale no debe tumbar el pago ni el envío.
// ============================================================
const { enviarCorreo, configurado } = require('./correo')
const { obtenerInfoTienda } = require('./tienda')

const COLOR = { texto: '#3B302A', suave: '#6E665C', borde: '#E0D8CB', fondo: '#F1EADC', acento: '#2C5C7C' }

function escaparHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO')
// "Entretela doble punto · Negro": la variante (color) importa para el pedido.
const nombreItem = (i) => (i.variante ? `${i.nombre} · ${i.variante}` : i.nombre)
const primerNombre = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || ''

// WhatsApp, horarios y dirección (solo si ya está definida) del almacén.
async function contactoTienda() {
  try {
    const info = Object.fromEntries((await obtenerInfoTienda()).map((f) => [f.clave, f.valor]))
    const direccion = info.direccion && !/pendiente/i.test(info.direccion) ? info.direccion : null
    return {
      whatsapp:     info.whatsapp || null,
      whatsappLink: info.whatsapp_link || null,
      horario:      [info.horario_semana && `Lunes a viernes ${info.horario_semana}`,
                     info.horario_sabado && `sábados ${info.horario_sabado}`].filter(Boolean).join(' · '),
      direccion,
    }
  } catch {
    return { whatsapp: null, whatsappLink: null, horario: '', direccion: null }
  }
}

// Marco común de todos los correos: título, cuerpo y pie con el contacto.
function plantilla({ titulo, cuerpoHtml, contacto }) {
  const whatsapp = contacto.whatsapp
    ? `Si tienes preguntas, escríbenos por WhatsApp al <a href="${escaparHtml(contacto.whatsappLink || '#')}" style="color:${COLOR.acento}">${escaparHtml(contacto.whatsapp)}</a>.`
    : 'Si tienes preguntas, responde este correo.'
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:${COLOR.texto};max-width:600px;margin:0 auto">
      <p style="font-size:20px;font-weight:700;color:${COLOR.acento};margin:0 0 18px">Russitex</p>
      <h1 style="font-size:19px;margin:0 0 14px">${escaparHtml(titulo)}</h1>
      ${cuerpoHtml}
      <p style="font-size:13px;color:${COLOR.suave};margin-top:26px;border-top:1px solid ${COLOR.borde};padding-top:14px">
        ${whatsapp}
      </p>
    </div>`
}

function boton(url, texto) {
  return `<p style="margin:18px 0"><a href="${escaparHtml(url)}" style="display:inline-block;background:${COLOR.acento};color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">${escaparHtml(texto)}</a></p>`
}

function tablaProductos(pedido) {
  const filas = (pedido.carrito || []).map((i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid ${COLOR.borde}">${escaparHtml(nombreItem(i))} × ${escaparHtml(i.cantidad)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${COLOR.borde};text-align:right;white-space:nowrap">${pesos((i.precio || 0) * (i.cantidad || 1))}</td>
    </tr>`).join('')
  const envio = Number(pedido.envio?.costo) || 0
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin:6px 0 4px">
      ${filas}
      <tr><td style="padding:8px 10px">Envío</td><td style="padding:8px 10px;text-align:right">${envio ? pesos(envio) : 'Gratis'}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:700;background:${COLOR.fondo}">Total pagado</td>
          <td style="padding:8px 10px;font-weight:700;background:${COLOR.fondo};text-align:right">${pesos(pedido.totalPesos)}</td></tr>
    </table>`
}

function textoProductos(pedido) {
  const lineas = (pedido.carrito || []).map((i) => `- ${nombreItem(i)} x ${i.cantidad}: ${pesos((i.precio || 0) * (i.cantidad || 1))}`)
  const envio = Number(pedido.envio?.costo) || 0
  return [...lineas, `Envío: ${envio ? pesos(envio) : 'Gratis'}`, `Total pagado: ${pesos(pedido.totalPesos)}`].join('\n')
}

// Envía sin dejar que un fallo de correo se propague.
async function enviarSeguro(etiqueta, datos) {
  if (!configurado()) {
    console.warn(`[notificaciones] Correo sin configurar (SMTP_*): no se envió "${etiqueta}".`)
    return false
  }
  if (!datos.destino) {
    console.warn(`[notificaciones] Sin correo de destino: no se envió "${etiqueta}".`)
    return false
  }
  try {
    const id = await enviarCorreo(datos)
    console.log(`✉️  [notificaciones] ${etiqueta} → ${datos.destino} (${id})`)
    return true
  } catch (e) {
    console.error(`[notificaciones] Falló "${etiqueta}": ${e.message}`)
    return false
  }
}

// ------------------------------------------------------------
// 1. Pago aprobado
// ------------------------------------------------------------
function armarCorreoPedidoAprobado(pedido, contacto) {
  const nombre = primerNombre(pedido.cliente?.nombre)
  const domicilio = pedido.envio?.modalidad !== 'tienda' && Boolean(pedido.envio?.codigoDane)
  const guia = pedido.guia

  let entregaHtml, entregaTexto
  if (!domicilio) {
    const donde = contacto.direccion ? ` en ${contacto.direccion}` : ''
    entregaHtml = `<p style="font-size:15px;line-height:1.55">Elegiste <strong>recoger en la tienda</strong>. Te avisaremos cuando tu pedido esté listo para recogerlo${escaparHtml(donde)}.${contacto.horario ? `<br><span style="color:${COLOR.suave};font-size:13px">Horario: ${escaparHtml(contacto.horario)}</span>` : ''}</p>`
    entregaTexto = `Elegiste recoger en la tienda. Te avisaremos cuando tu pedido esté listo para recogerlo${donde}.${contacto.horario ? ` Horario: ${contacto.horario}.` : ''}`
  } else if (guia?.numeroGuia) {
    const destino = [pedido.envio?.direccion, pedido.envio?.ciudad].filter(Boolean).join(', ')
    entregaHtml = `
      <p style="font-size:15px;line-height:1.55">Lo enviamos a <strong>${escaparHtml(destino)}</strong>${pedido.envio?.transportadora ? ` con ${escaparHtml(pedido.envio.transportadora)}` : ''}.</p>
      <p style="font-size:15px;margin:4px 0">Número de guía: <strong>${escaparHtml(guia.numeroGuia)}</strong></p>
      ${guia.rastreoUrl ? boton(guia.rastreoUrl, 'Rastrear mi envío') : ''}
      <p style="font-size:13px;color:${COLOR.suave}">Te llegarán correos con cada avance del envío.</p>`
    entregaTexto = `Lo enviamos a ${destino}${pedido.envio?.transportadora ? ` con ${pedido.envio.transportadora}` : ''}.\nNúmero de guía: ${guia.numeroGuia}${guia.rastreoUrl ? `\nRastreo: ${guia.rastreoUrl}` : ''}\nTe llegarán correos con cada avance del envío.`
  } else {
    const destino = [pedido.envio?.direccion, pedido.envio?.ciudad].filter(Boolean).join(', ')
    entregaHtml = `<p style="font-size:15px;line-height:1.55">Lo enviaremos a <strong>${escaparHtml(destino)}</strong>. Cuando lo despachemos te mandamos el número de guía para que lo rastrees.</p>`
    entregaTexto = `Lo enviaremos a ${destino}. Cuando lo despachemos te mandamos el número de guía para que lo rastrees.`
  }

  const asunto = `Tu pedido ${pedido.referencia} está confirmado`
  const html = plantilla({
    titulo: `¡Gracias por tu compra${nombre ? `, ${nombre}` : ''}!`,
    contacto,
    cuerpoHtml: `
      <p style="font-size:15px;line-height:1.55">Recibimos tu pago y tu pedido <strong>${escaparHtml(pedido.referencia)}</strong> quedó confirmado.</p>
      ${tablaProductos(pedido)}
      <h2 style="font-size:16px;margin:22px 0 6px">Entrega</h2>
      ${entregaHtml}`,
  })
  const texto = [
    `¡Gracias por tu compra${nombre ? `, ${nombre}` : ''}!`,
    `Recibimos tu pago y tu pedido ${pedido.referencia} quedó confirmado.`,
    '', textoProductos(pedido), '', 'ENTREGA', entregaTexto,
    contacto.whatsapp ? `\nPreguntas: WhatsApp ${contacto.whatsapp}` : '',
  ].join('\n')
  return { asunto, html, texto }
}

async function avisarPedidoAprobado(pedido) {
  const contacto = await contactoTienda()
  const { asunto, html, texto } = armarCorreoPedidoAprobado(pedido, contacto)
  return enviarSeguro(`pedido aprobado ${pedido.referencia}`, {
    destino: pedido.cliente?.email, asunto, html, texto,
    responderA: process.env.CORREO_DESTINO || undefined,
  })
}

// ------------------------------------------------------------
// 2. Novedad del envío (a la tienda, no al cliente)
// ------------------------------------------------------------
async function avisarNovedadAlmacen(pedido, estado) {
  const guia = pedido.guia || {}
  const c = pedido.cliente || {}
  const texto = [
    `El envío del pedido ${pedido.referencia} reporta una novedad: ${estado}.`,
    '',
    `Guía: ${guia.numeroGuia} (${pedido.envio?.transportadora || guia.carrier})`,
    guia.rastreoUrl ? `Rastreo: ${guia.rastreoUrl}` : '',
    `Cliente: ${c.nombre} · ${c.telefono} · ${c.email}`,
    `Dirección: ${[pedido.envio?.direccion, pedido.envio?.ciudad].filter(Boolean).join(', ')}`,
    '',
    'Conviene llamar al cliente y revisar el caso con la transportadora.',
  ].join('\n')
  const html = `<pre style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;white-space:pre-wrap">${escaparHtml(texto)}</pre>`
  return enviarSeguro(`novedad ${estado} ${pedido.referencia}`, {
    destino: process.env.CORREO_DESTINO || process.env.SMTP_USER,
    asunto: `Novedad en el envío del pedido ${pedido.referencia}: ${estado}`,
    texto, html,
    responderA: c.email || undefined,
  })
}

module.exports = {
  avisarPedidoAprobado,
  avisarNovedadAlmacen,
  // Para revisar cómo quedan los correos sin enviarlos.
  armarCorreoPedidoAprobado,
}
