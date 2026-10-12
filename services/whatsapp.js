// ============================================================
//  services/whatsapp.js  —  Avisos por WhatsApp (API oficial de Meta)
//
//  Usa la WhatsApp Cloud API directamente (sin intermediarios). Los mensajes
//  que inicia la tienda tienen que ser PLANTILLAS aprobadas por Meta; están
//  en PLANTILLAS más abajo y se crean con scripts/whatsapp-plantillas.js.
//
//  Número: uno propio para avisos (no el 313 890 9118 de atención, que sigue
//  en la app). Por eso cada plantilla remite al número de atención.
//
//  Variables (.env y Render):
//    WHATSAPP_ACTIVO            "true" para enviar de verdad (si no, no hace nada)
//    WHATSAPP_TOKEN             token permanente del usuario del sistema
//    WHATSAPP_PHONE_NUMBER_ID   id del número que envía (Configuración de la API)
//    WHATSAPP_WABA_ID           id de la cuenta de WhatsApp Business (para las plantillas)
//    WHATSAPP_APP_SECRET        clave secreta de la app (firma del webhook)
//    WHATSAPP_VERIFY_TOKEN      clave inventada por nosotros para registrar el webhook
//    WHATSAPP_AVISO_TIENDA      celular(es) que reciben los pedidos nuevos, separados por coma
//    WHATSAPP_API_VERSION       versión de la Graph API (por defecto v23.0)
//
//  Nunca lanza errores hacia afuera: un WhatsApp que no sale no debe tumbar
//  el pago, el envío ni los correos.
// ============================================================

const ATENCION = '+57 313 890 9118'

// Textos que se envían a Meta para aprobación. {{n}} = variables.
// Meta no deja empezar ni terminar el texto con una variable, ni que lleven
// saltos de línea: por eso los parámetros se limpian en `limpiar()`.
const PLANTILLAS = {
  pedido_nuevo_tienda: {
    categoria: 'UTILITY',
    texto: 'Nuevo pedido pagado en russitex.com: {{1}} por {{2}}. Entrega: {{3}}. Para empacar: {{4}}. ' +
      'Los detalles y la guía para imprimir están en el correo de la tienda.',
    ejemplo: ['PEDIDO-1791684749059-8RECE', '$216.940', 'envío a Baranoa, Atlántico', '20 metros de Bayetilla'],
  },
  pedido_confirmado: {
    categoria: 'UTILITY',
    texto: 'Hola {{1}}, recibimos el pago de tu pedido {{2}} por {{3}}. {{4}} ' +
      `Este número solo envía avisos; para atención escríbenos al ${ATENCION}.`,
    ejemplo: ['María', 'PEDIDO-1791684749059-8RECE', '$216.940', 'Lo estamos preparando para enviarlo a Baranoa.'],
  },
  pedido_en_camino: {
    categoria: 'UTILITY',
    texto: 'Hola {{1}}, tu pedido {{2}} va en camino con {{3}}. Número de guía: {{4}}. Puedes rastrearlo en {{5}} ' +
      `Este número solo envía avisos; para atención escríbenos al ${ATENCION}.`,
    ejemplo: ['María', 'PEDIDO-1791684749059-8RECE', 'InterRapidisimo', '240012345678', 'https://envia.com/rastreo?label=240012345678'],
  },
}

const activo = () => process.env.WHATSAPP_ACTIVO === 'true' &&
  Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
const graph = (ruta) => `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v23.0'}/${ruta}`

// "300 123 4567", "+57 300…", "57300…" -> "573001234567". null si no sirve.
function numeroWhatsapp(tel) {
  let d = String(tel || '').replace(/\D/g, '')
  if (d.length === 10 && d.startsWith('3')) d = '57' + d
  return /^573\d{9}$/.test(d) ? d : null
}

// Meta rechaza parámetros con saltos de línea, tabuladores o más de 4 espacios seguidos.
const limpiar = (v) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 900) || '-'

async function llamarGraph(ruta, body) {
  const res = await fetch(graph(ruta), {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const datos = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${datos?.error?.message || JSON.stringify(datos)?.slice(0, 200)}`)
  return datos
}

// Envía una plantilla. Devuelve true si Meta la aceptó.
async function enviarPlantilla(etiqueta, telefono, plantilla, parametros) {
  if (!activo()) return false
  const to = numeroWhatsapp(telefono)
  if (!to) {
    console.warn(`[whatsapp] ${etiqueta}: número no válido (${telefono || 'vacío'}), no se envía.`)
    return false
  }
  try {
    const r = await llamarGraph(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: plantilla,
        language: { code: 'es' },
        components: [{ type: 'body', parameters: parametros.map((p) => ({ type: 'text', text: limpiar(p) })) }],
      },
    })
    console.log(`💬 [whatsapp] ${etiqueta} → ${to.slice(0, 5)}… (${r?.messages?.[0]?.id || 'ok'})`)
    return true
  } catch (e) {
    console.error(`[whatsapp] Falló "${etiqueta}": ${e.message}`)
    return false
  }
}

// ------------------------------------------------------------
// Avisos concretos
// ------------------------------------------------------------
const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO')
const titulo = (s) => String(s || '').toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase())
const primerNombre = (c) => (c?.empresa?.razonSocial ? c.empresa.razonSocial : String(c?.nombres || c?.nombre || '').trim().split(/\s+/)[0]) || 'cliente'

function unidad(cantidad, u) {
  const base = String(u || '').replace(/^(venta\s+por|por)\s+/i, '').trim().toLowerCase()
  if (!base) return `${cantidad} ×`
  if (Number(cantidad) === 1) return `1 ${base} de`
  return `${cantidad} ${/[aeiou]$/.test(base) ? base + 's' : base + 'es'} de`
}

function entregaTexto(pedido) {
  const e = pedido.envio || {}
  if (e.modalidad === 'tienda') return 'recoge en la tienda'
  return `envío a ${[titulo(e.ciudad), titulo(e.departamento)].filter(Boolean).join(', ')}`
}

// A la tienda (celular(es) de WHATSAPP_AVISO_TIENDA), por cada pedido pagado.
async function avisarPedidoTiendaWhatsapp(pedido) {
  const numeros = String(process.env.WHATSAPP_AVISO_TIENDA || '').split(',').map((n) => n.trim()).filter(Boolean)
  const empacar = (pedido.carrito || [])
    .map((i) => `${unidad(i.cantidad, i.unidad)} ${i.nombre}${i.variante ? ` (${i.variante})` : ''}`).join('; ')
  const parametros = [pedido.referencia, pesos(pedido.totalPesos), entregaTexto(pedido), empacar]
  for (const n of numeros) await enviarPlantilla(`pedido nuevo ${pedido.referencia}`, n, 'pedido_nuevo_tienda', parametros)
}

// Al cliente, solo si aceptó avisos por WhatsApp en el checkout.
async function avisarPedidoConfirmadoWhatsapp(pedido) {
  const c = pedido.cliente || {}
  if (!c.avisosWhatsapp) return false
  const siguiente = pedido.envio?.modalidad === 'tienda'
    ? 'Te avisamos cuando esté listo para recoger en la tienda.'
    : `Lo estamos preparando para enviarlo a ${titulo(pedido.envio?.ciudad) || 'tu dirección'}.`
  return enviarPlantilla(`pedido confirmado ${pedido.referencia}`, c.telefono, 'pedido_confirmado',
    [primerNombre(c), pedido.referencia, pesos(pedido.totalPesos), siguiente])
}

async function avisarPedidoEnCaminoWhatsapp(pedido) {
  const c = pedido.cliente || {}
  const g = pedido.guia || {}
  if (!c.avisosWhatsapp || !g.numeroGuia) return false
  return enviarPlantilla(`pedido en camino ${pedido.referencia}`, c.telefono, 'pedido_en_camino',
    [primerNombre(c), pedido.referencia, pedido.envio?.transportadora || g.carrier || 'la transportadora',
      g.numeroGuia, g.rastreoUrl || 'la página de la transportadora'])
}

module.exports = {
  PLANTILLAS,
  activo,
  graph,
  llamarGraph,
  numeroWhatsapp,
  avisarPedidoTiendaWhatsapp,
  avisarPedidoConfirmadoWhatsapp,
  avisarPedidoEnCaminoWhatsapp,
}
