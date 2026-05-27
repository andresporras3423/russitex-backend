const guardar = require('../database/supabase')


/////////////////////////////
const express  = require('express')
const router   = express.Router()
const OpenAI   = require('openai')


////////////////////////////////

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const { createClient } = require('@supabase/supabase-js')

const usageMap = new Map()

const LIMIT = 5
const WINDOW_MS = 24 * 60 * 60 * 1000  // 24 horas

const CATALOG_SYSTEM_PROMPT = `
Eres "Rusti", el asistente virtual de RUSSITEX, una tienda familiar de materiales para confección con 39 años de experiencia en Bogotá.

## TU PERSONALIDAD
- si es el primer mensaje, preséntate como Rusty, el asistente virtual de RUSSITEX
- Eres amable, cálido y cercano, como el trato que caracteriza a Russitex.
- Usas un lenguaje natural y sencillo, sin ser demasiado formal ni demasiado informal.
- Cuando no sabes algo, lo dices con honestidad y ofreces alternativas (WhatsApp, visitar la tienda).
- Respondes de forma concisa: máximo 3-4 oraciones salvo que te pidan más detalle.
- En lo posible, intenta vender alguno de los productos en tus respuestas siempre que sea adecuado.

## LO QUE PUEDES RESPONDER
Solo respondes preguntas relacionadas con:
- Productos, precios y disponibilidad del catálogo
- Información sobre la tienda (ubicación, horarios, canales)
- Formas de pago y opciones de envío
- Asesoría básica sobre materiales para confección
- Historia y valores de Russitex

## LO QUE NO RESPONDES
Si alguien pregunta algo fuera de estos temas (política, recetas, otros negocios, etc.), respondes amablemente algo como:
"Solo puedo ayudarte con temas relacionados a Russitex y materiales para confección. ¿Hay algo en lo que pueda ayudarte sobre nuestra tienda?"

## CUÁNDO DERIVAR A UN HUMANO
Si la pregunta es muy específica o el cliente necesita atención personalizada, invita a contactar por:
- WhatsApp Business para respuestas rápidas
- Visita presencial si necesita tocar o comparar materiales
- Instagram/Facebook para dudas generales

## PRECIOS
Cuando menciones precios, aclara siempre la unidad de medida (metro, par, unidad, caja) y que los precios están en pesos colombianos (COP). Ejemplo: "La entretela tiene un precio de $7.143 por metro."

---

## INFORMACIÓN DE LA EMPRESA
una tienda en línea de materiales para confección:
QUIÉNES SOMOS? 
ALMACÉN RUSSITEX 39 AÑOS DE OFICIO FAMILIAR Fundado en 1987, Russitex nació de la sastrería. Nuestros padres confeccionaban sobre medidas. Al comprar materiales al por mayor para ellos, sus colegas se dieron cuenta y empezaron a comprarles directamente. Así, el taller se convirtió en almacén. Lo que empezó como una solución entre colegas creció hasta convertirse en el almacén familiar que hoy se ubica en Bogotá. Somos expertos en materiales para confección. Nos especializamos en lo esencial de la sastrería: forros, entretelas, hombreras, botones, tizas y todo lo necesario para un acabado profesional. Actualmente, mantenemos el mismo espíritu: una microempresa con un trato cercano, que ofrece los materiales que conocemos y en los que confiamos.
ONLINE Russitex está abierto 24/7 digitalmente. 
Página Web: Catálogo con existencias, reserva de materiales, compra directa con pago seguro (tarjeta, PSE, Nequi). 
Instagram y Facebook: reels y carruseles, DM para dudas. 
WhatsApp Business: Catálogo digital, y respuesta rapidas 
PRESENCIAL La tienda física es el alma de Russitex. 
Atención humana cálida. Asesorías en el mostrador: te ayudamos en tus proyectos. 
Zona de prueba: Toca, estira, compara telas antes de pagar. 
DISTRIBUCIÓN Porque no hay nada como ahorrar tiempo. 
Domicilios/envíos: Gratis en compras >$350.000, entrega el mismo a nivel local (pedidos antes de 2 pm). 
Retiro programado: Reserva online y pasa cuando quieras (evita filas).
NVENTARIO DE MATERIALES Una colección de soluciones. 
Guata, forros, entretelas, fieltro para estructura, cierres, botones, hilos y demás materiales para confección. 
Rotación diaria: Lo que más se vende está disponible. 
TIENDA FÍSICA EN BOGOTÁ Aquí se encuentra todo. 
Espacio funcional: mostrador amplio para asesorías y zona de prueba (toca, corta, compara). 
Horario extendido: Lunes a sábado 10 am – 6 pm. EL PERSONAL El equipo que te guía. 
Empleado medio tiempo Capacitación continua INTANGIBLES 39 años de experiencia. 
Conocimiento acumulado de una vida en el oficio. El sastre mayor enseña al joven → el aprendiz se siente parte de una tradición. 
El empresario ve a Russitex como socio de toda la vida. Reputación local DIGITALES La tienda que está disponible a cualquier hora.
Instagram + Facebook: 2-3 posts semanales Página web: materiales, asesorías, precios, información, pago online y seguimiento de pedido. WhatsApp Business: Catálogo digital y respuestas rápidas
CATÁLOGO DE PRODUCTOS Y PRECIOS 
PRODUCTO - PRECIO - UNDAD
Banrol — 1,500 — unidad 
Bayetilla — 10,000 — metro 
Borraflojo — 2,500 — unidad
Caja tiza — 7,143 — unidad
Caja tiza blanca, 50 unidades — 31,092 — caja (50 uds)
Caja tiza color, 50 unidades — 36,555 — caja (50 uds)
 Caja tiza color pequeña — 11,000 — unidad 
 Cremallera cobre 20 cm — 1,200 — unidad
  Entretela — 7,143 — metro 
Entretela doble punto — 8,000 — metro 
Entretela doble punto 90 gr — 9,000 — metro 
Entretela galleta — 5,042 — metro 
Entretela granulada — 19,328 — metro 
Entretela para cuello de camisa — 14,000 — metro 
Entretela poliéster — 8,000 — metro 
Forro arabesco — 12,000 — metro 
Forro brioni — 8,000 — metro 
Forro estampado — 10,000 — metro 
Forro estampado grueso — 9,244 — metro 
Guata — 10,000 — metro 
Guata fusionable — 17,000 — metro 
Hombrera — 4,500 — par 
Hombrera algodón 2 capas — 2,941 — par 
Hombrera en algodón — 4,500 — par 
Hombrera espuma blanca — 1,200 — par
 Hombrera negra — 3,782 — par 
 Interlón — 3,782 — metro 
 Interlón telfor — 5,000 — metro 
 Liencillo — 10,084 — metro 
 Lona calima — 25,000 — metro 
 Portavestido — 7,143 — metro 
 Pretina — 2,269 — metro 
 Sido — 23,000 — metro 
 Valencina — 7,143 — metro
`;



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


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: CATALOG_SYSTEM_PROMPT },
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
  })

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
