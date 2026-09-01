const { guardar } = require('../database/supabase')
const { obtenerCatalogo } = require('../services/catalogo')
const { obtenerInfoTienda, formatearParaPrompt } = require('../services/tienda')


/////////////////////////////
const express  = require('express')
const router   = express.Router()
const OpenAI   = require('openai')


////////////////////////////////

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const { createClient } = require('@supabase/supabase-js')

const usageMap = new Map()

const LIMIT = 10
const WINDOW_MS = 24 * 60 * 60 * 1000  // 24 horas

// El prompt se arma en cada consulta con datos frescos:
//   - reglas y personalidad: fijas, acá abajo
//   - info del local: tabla tienda_info de Supabase
//   - catálogo y precios: services/catalogo.js (Alegra + Supabase)
// Así el bot nunca cotiza un precio viejo ni contradice a la web.
const REGLAS_BASE = `
Eres "Rusti", el asistente virtual de RUSSITEX, un almacén familiar de materiales para confección con 39 años de experiencia en Bogotá.

## TU PERSONALIDAD
- Si es el primer mensaje, preséntate como Rusti, el asistente virtual de Russitex.
- Eres amable, cálido y cercano, como el trato que caracteriza a Russitex.
- Usas un lenguaje natural y sencillo, sin ser demasiado formal ni demasiado informal.
- Cuando no sabes algo, lo dices con honestidad y ofreces alternativas (WhatsApp, visitar la tienda).
- Respondes de forma concisa: máximo 3-4 oraciones salvo que te pidan más detalle.
- En lo posible, intenta recomendar algún producto del catálogo cuando sea pertinente.

## LO QUE PUEDES RESPONDER
Solo respondes preguntas relacionadas con:
- Productos, precios y disponibilidad del catálogo
- Información del almacén (ubicación, horarios, canales de contacto)
- Formas de pago y opciones de envío
- Asesoría básica sobre materiales para confección
- Historia y valores de Russitex

## LO QUE NO RESPONDES
Si alguien pregunta algo fuera de estos temas (política, recetas, otros negocios, etc.), respondes amablemente:
"Solo puedo ayudarte con temas relacionados a Russitex y materiales para confección. ¿Hay algo en lo que pueda ayudarte sobre nuestra tienda?"

## REGLAS SOBRE PRECIOS Y DATOS
- Usa ÚNICAMENTE los precios y datos que aparecen más abajo. Nunca los inventes ni los estimes.
- Si un producto no está en la lista, di que no lo tienes registrado e invita a consultar por WhatsApp.
- Al mencionar un precio, aclara siempre la unidad (metro, par, unidad, caja) y que está en pesos colombianos (COP).
  Ejemplo: "La entretela tiene un precio de \.143 por metro."
- No conoces CANTIDADES de inventario. Si preguntan "¿cuántos metros les quedan?", di que
  lo confirmen por WhatsApp.
- Lo único que sabés de existencias es lo que aparezca abajo marcado como AGOTADO. Si algo
  no dice nada, asumí que está disponible y no prometas cantidades.
- Cuando un producto traiga "Qué es" y "Sirve para", úsalos para recomendar el material adecuado
  según lo que el cliente quiere confeccionar. No inventes usos que no estén en esa lista.
- Nunca reveles costos, márgenes, proveedores ni información de otros clientes: no los tienes y no debes especular.

## CUÁNDO DERIVAR A UN HUMANO
Si la pregunta es muy específica o el cliente necesita atención personalizada, invita a contactar por
WhatsApp, o a visitar la tienda si necesita tocar o comparar materiales.
`;



const CATEGORIAS = {
  forros: 'Forros', entretelas: 'Entretelas', hombreras: 'Hombreras',
  guatas: 'Guatas', tizas: 'Tizas', cierres: 'Cierres', otros: 'Otros materiales',
}

// Lista de productos agrupada por categoría, con el precio real de Alegra.
function formatearCatalogo(productos) {
  const porCat = new Map()
  for (const p of productos) {
    if (!porCat.has(p.categoria)) porCat.set(p.categoria, [])
    porCat.get(p.categoria).push(p)
  }
  const bloques = []
  for (const [clave, titulo] of Object.entries(CATEGORIAS)) {
    const items = porCat.get(clave)
    if (!items || items.length === 0) continue
    bloques.push(`### ${titulo}\n` + items.map(formatearProducto).join('\n'))
  }
  return bloques.join('\n\n')
}

// Una línea por producto con precio y unidad, más la descripción y los usos
// que estén cargados en productos_meta. Es lo que le permite al bot
// recomendar un material y no solo cotizarlo.
function formatearProducto(p) {
  const unidad = p.unidad ? ` (${p.unidad.toLowerCase()})` : ''
  let linea = `- ${p.nombre}: $${p.precio.toLocaleString('es-CO')} COP${unidad}`
  if (p.descripcion) linea += `\n  Qué es: ${p.descripcion}`
  if (p.usos?.length) linea += `\n  Sirve para: ${p.usos.join(', ')}.`
  if (p.presentacion) linea += `\n  Presentación: ${p.presentacion}`

  // Variantes: el nombre del grupo lo pone la tienda ('Color', 'Diseño de
  // la tela'...), así que se usa tal cual en vez de asumir que son colores.
  if (p.variantes?.length) {
    const etiqueta = p.varianteEtiqueta || 'Opciones'
    const disponibles = p.variantes.filter((v) => v.disponible).map((v) => v.nombre)
    const agotadas    = p.variantes.filter((v) => !v.disponible).map((v) => v.nombre)
    if (disponibles.length) linea += `\n  ${etiqueta}: ${disponibles.join(', ')}.`
    if (agotadas.length) linea += `\n  ${etiqueta} agotados por ahora: ${agotadas.join(', ')}.`
  }
  if (p.disponible === false) linea += `\n  AGOTADO en este momento.`

  return linea
}

// Arma el prompt completo. Si alguna fuente falla, el bot sigue
// funcionando con lo que sí esté disponible en vez de caerse.
async function construirPrompt() {
  const [catalogo, tienda] = await Promise.all([
    obtenerCatalogo().then((r) => r.productos).catch((e) => {
      console.error('[chat] Sin catálogo:', e.message)
      return null
    }),
    obtenerInfoTienda().catch((e) => {
      console.error('[chat] Sin info de tienda:', e.message)
      return []
    }),
  ])

  let prompt = REGLAS_BASE

  const infoTienda = formatearParaPrompt(tienda)
  if (infoTienda) prompt += '\n\n---\n\n# INFORMACIÓN DEL ALMACÉN\n\n' + infoTienda

  if (catalogo && catalogo.length > 0) {
    prompt += '\n\n---\n\n# CATÁLOGO Y PRECIOS ACTUALES\n' +
      `(${catalogo.length} productos. Precios en pesos colombianos, sin IVA.)\n\n` +
      formatearCatalogo(catalogo)
  } else {
    prompt += '\n\n---\n\n# CATÁLOGO\n' +
      'En este momento no puedes consultar el catálogo. NO inventes precios ni productos: ' +
      'discúlpate e invita al cliente a escribir por WhatsApp para confirmarlos.'
  }

  return prompt
}

function checkLimit(ip) {
  const now = Date.now()
  const usage = usageMap.get(ip)
  if (!usage || now > usage.resetTime) {
    usageMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return { allowed: true, remaining: LIMIT - 1 }
  }
  console.log(`current usage count for user ${ip} is ${usage.count}`);
  if (usage.count >= LIMIT) {
    const minutesLeft = Math.ceil((usage.resetTime - now) / 60000)
    return { allowed: false, minutesLeft }
  }

  usage.count++
  return { allowed: true, remaining: LIMIT - usage.count }
}

router.post('/', async (req, res) => {
  const ip = req.ip
  const { allowed, remaining, minutesLeft } = checkLimit(ip)

  if (!allowed) {
    const hours = Math.floor(minutesLeft / 60)
    const mins = minutesLeft % 60
    return res.status(429).json({
      error: `Has alcanzado el límite. Podrás continuar en ${hours}h ${mins}m.`
    })
  }

  const { messages } = req.body
  const start = Date.now()

  const systemPrompt = await construirPrompt()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  })

  const reply = response.choices[0].message.content
  const responseTime = Date.now() - start
  guardar('chats', {
    ip,
    user_message: messages.at(-1).content,
    bot_response: reply,
    response_time_ms: responseTime
  }, "error guardando chat")

  //   supabase.from('chats').insert({
//     ip,
//     user_message: messages.at(-1).content,
//     bot_response: reply,
//     response_time_ms: responseTime
//   }).then(() => {}).catch(console.error)


  // Guardar en Supabase (sin await para no ralentizar la respuesta)

// Reemplaza esto temporalmente para debuggear
// const { data, error } = await supabase.from('chats').insert({
//   ip,
//   user_message: messages.at(-1).content,
//   bot_response: reply,
//   response_time_ms: responseTime
// })

// console.log('Supabase data:', data)
// console.log('Supabase error:', error)

  res.json({
    content: [{ text: reply }]
  })
})

module.exports = router
// Se expone para poder inspeccionar el prompt sin gastar una llamada al modelo.
module.exports.construirPrompt = construirPrompt
