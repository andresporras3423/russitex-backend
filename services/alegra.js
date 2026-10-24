// ============================================================
//  services/alegra.js  —  Integración con Alegra
//
//  - obtenerProductos(): lee el catálogo (nombres y precios).
//    Alegra es la fuente de verdad de nombre/precio; la categoría
//    y la imagen viven en Supabase (Alegra no puede guardarlas).
//  - generarFactura(): factura electrónica al aprobarse un pago.
// ============================================================

const ALEGRA_API_URL = 'https://api.alegra.com/api/v1';
const ALEGRA_USUARIO = process.env.ALEGRA_USUARIO;
const ALEGRA_TOKEN   = process.env.ALEGRA_TOKEN;

function authHeader() {
  if (!ALEGRA_USUARIO || !ALEGRA_TOKEN) {
    throw new Error('Faltan ALEGRA_USUARIO o ALEGRA_TOKEN en el archivo .env')
  }
  return 'Basic ' + Buffer.from(`${ALEGRA_USUARIO}:${ALEGRA_TOKEN}`).toString('base64')
}

// Alegra devuelve el precio de dos formas según la cuenta: un número suelto,
// o un arreglo de listas de precios. Normalizamos ambos casos.
function normalizarPrecio(price) {
  if (typeof price === 'number') return price
  if (typeof price === 'string' && price.trim() !== '') return Number(price)
  if (Array.isArray(price) && price.length > 0) {
    const p = price[0]
    const valor = typeof p === 'object' ? (p.price ?? p.value) : p
    return Number(valor) || 0
  }
  if (price && typeof price === 'object') return Number(price.price ?? price.value) || 0
  return 0
}

// Alegra devuelve la unidad en inglés ('meter', 'unit'...). La pasamos al
// texto que muestra la web. Si en productos_meta cargaste una unidad propia,
// esa tiene prioridad sobre esta traducción.
const UNIDADES = {
  meter: 'Por metro',
  metro: 'Por metro',
  unit:  'Por unidad',
  pair:  'Por par',
  box:   'Por caja',
  kit:   'Por caja',
}

// ------------------------------------------------------------
//  DISPONIBILIDAD — por qué NO se usa el inventario de Alegra
//
//  Decidido con Oscar el 2026-08-23, después de probarlo encendido.
//
//  Los números de Alegra no sirven, y el motivo es preciso: las VENTAS
//  se registran (por eso baja), pero las COMPRAS no (nadie anota cuando
//  llega mercancía). Así quedan:
//        entretela doble punto -> inicial 1    disponible -3366.4
//        Hombrera en algodón   -> inicial 500  disponible  -804
//        Sido                  -> inicial 10000 disponible 9889.1
//    y los otros 36 con initialQuantity = 99999, el relleno de Alegra.
//
//  No es un problema de variantes: Alegra factura un ítem por producto,
//  no por color. Partir un producto en varios códigos de Alegra daría
//  varios contadores negativos en vez de uno.
//
//  Por eso la disponibilidad es un BOOLEANO MANUAL en Supabase:
//      productos_meta.disponible        -> el producto entero
//      producto_variantes.disponible    -> cada color / estampado
//
//  Equivocarse hacia "hay" sale más barato que hacia "no hay": un
//  "Agotado" falso pierde la venta en silencio; un "disponible" falso
//  termina en una conversación por WhatsApp, que iba a pasar igual.
//
//  PENDIENTE: una pantalla de administración para marcar esto. Si hay
//  que entrar al panel de Supabase a editar filas, nadie lo va a hacer
//  y la web va a mentir igual que Alegra.
//
//  Si algún día en Alegra se registran también las compras, poner esta
//  constante en true y el mecanismo revive solo: la ficha y el bot ya
//  soportan el estado agotado.
// ------------------------------------------------------------
const USAR_INVENTARIO_ALEGRA = false

const CANTIDAD_PLACEHOLDER = 9999

function disponibilidad(item) {
  if (!USAR_INVENTARIO_ALEGRA) return { disponible: true, stockReal: false }

  const cantidad = Number(
    item.inventory?.availableQuantity ?? item.inventory?.initialQuantity ?? NaN
  )
  // Sin dato, o el relleno de Alegra: no sabemos, así que no decimos que falta.
  if (!Number.isFinite(cantidad) || cantidad >= CANTIDAD_PLACEHOLDER) {
    return { disponible: true, stockReal: false }
  }
  return { disponible: cantidad > 0, stockReal: true }
}

function normalizarItem(item) {
  const unidadCruda = item.inventory?.unit ?? item.unit ?? null
  const { disponible, stockReal } = disponibilidad(item)
  return {
    alegraId: String(item.id),
    nombre:   item.name,
    // Alegra guarda los precios con decimales (son valores sin IVA).
    // En pesos colombianos no se muestran centavos, así que redondeamos.
    precio:   Math.round(normalizarPrecio(item.price)),
    unidadAlegra: unidadCruda ? (UNIDADES[unidadCruda] || unidadCruda) : null,
    activo:   item.status !== 'inactive',
    disponible,
    // Le sirve al bot para saber si puede hablar de disponibilidad.
    stockReal,
  }
}

// ------------------------------------------------------------
// Trae TODOS los ítems, paginando hasta que Alegra deje de
// devolver resultados (por defecto la API pagina de a pocos).
// ------------------------------------------------------------
async function obtenerProductos({ limit = 30 } = {}) {
  const todos = []
  let start = 0

  // Tope de seguridad para no quedarnos en un bucle infinito si la API
  // ignorara el parámetro `start` y devolviera siempre la misma página.
  const MAX_PAGINAS = 50

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const url = `${ALEGRA_API_URL}/items?limit=${limit}&start=${start}`
    const res = await fetch(url, {
      headers: { Authorization: authHeader(), Accept: 'application/json' },
    })

    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      throw new Error(`Alegra respondió ${res.status} al pedir productos. ${detalle.slice(0, 200)}`)
    }

    const lote = await res.json()
    if (!Array.isArray(lote) || lote.length === 0) break

    todos.push(...lote)
    if (lote.length < limit) break   // última página
    start += limit
  }

  return todos.map(normalizarItem)
}

// ============================================================
//  FACTURACIÓN de los pedidos de la tienda en línea
//
//  Alegra no tiene ambiente de pruebas: todo pega en la cuenta real.
//  Por eso, mientras ALEGRA_EMITIR no sea "true", la factura se crea en
//  BORRADOR: queda en Alegra para revisarla, pero no consume numeración
//  ni se envía a la DIAN (se puede borrar desde Alegra).
//  Con ALEGRA_EMITIR=true se crea abierta y Alegra la emite a la DIAN.
//
//  Como las facturas que hace la tienda a mano, quedan "de contado" con
//  saldo pendiente: el plan actual de Alegra no deja registrar pagos por
//  API (las cuentas de banco responden "no se puede en tu plan actual").
//
//  Variables:
//    ALEGRA_EMITIR       "true" para emitir de verdad (por defecto borrador)
//    ALEGRA_NUMERACION   id de la numeración electrónica (PL2 = 17). Si no
//                        está, Alegra usa la preferida de la cuenta.
//    ALEGRA_NUMERACION_BORRADOR  numeración para los borradores ("Principal"
//                        = 1, no electrónica): ver generarFactura.
//    ALEGRA_ITEM_ENVIO   id del ítem de servicio "Envío" en Alegra.
// ============================================================

const emitirFacturas = () => process.env.ALEGRA_EMITIR === 'true'

async function llamarAlegra(ruta, { method = 'GET', body } = {}) {
  const res = await fetch(`${ALEGRA_API_URL}/${ruta}`, {
    method,
    headers: { Authorization: authHeader(), Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const datos = await res.json().catch(() => null)
  if (!res.ok) {
    const detalle = datos?.message || JSON.stringify(datos)?.slice(0, 300)
    const err = new Error(`Alegra ${method} /${ruta} respondió ${res.status}: ${detalle}`)
    err.status = res.status
    err.datos = datos
    throw err
  }
  return datos
}

// Fecha de hoy en Colombia (yyyy-mm-dd), no en UTC: después de las 7 p. m.
// el servidor ya estaría en el día siguiente.
function hoyColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

// Dígito de verificación del NIT (algoritmo de la DIAN).
function digitoVerificacion(nit) {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const digitos = String(nit).replace(/\D/g, '').split('').reverse()
  const suma = digitos.reduce((s, d, i) => s + Number(d) * pesos[i], 0)
  const r = suma % 11
  return String(r > 1 ? 11 - r : r)
}

// "SAN ANDRÉS DE TUMACO" -> "San Andrés De Tumaco"
function tituloCase(texto) {
  return String(texto || '').toLowerCase()
    .replace(/(^|[\s,(-])(\p{L})/gu, (m, sep, letra) => sep + letra.toUpperCase())
}

// Dirección como la tienen los clientes que ya están en Alegra.
function direccionAlegra(envio) {
  const direccion = { country: 'Colombia' }
  if (envio?.direccion) direccion.address = envio.direccion
  if (String(envio?.codigoDane || '').startsWith('11001')) {
    direccion.city = 'Bogotá, D.C.'
    direccion.department = 'Bogotá D.C.'
  } else if (envio?.codigoDane && envio?.ciudad && envio?.departamento) {
    direccion.city = tituloCase(envio.ciudad)
    direccion.department = tituloCase(envio.departamento)
  }
  return direccion
}

const TIPOS_DOCUMENTO = new Set(['CC', 'CE', 'NIT', 'PP', 'TI', 'PEP', 'DIE', 'NUIP'])

function numeroDocumento(cliente) {
  return String(cliente?.documento || '').replace(/[^\dA-Za-z]/g, '')
}

// Arma el contacto de Alegra con los datos del checkout. Con NIT se trata
// como empresa (razón social); si no, como persona (nombres y apellidos).
function contactoDesdeCliente(cliente, envio) {
  const tipo = TIPOS_DOCUMENTO.has(cliente.tipoDocumento) ? cliente.tipoDocumento : 'CC'
  const numero = numeroDocumento(cliente)
  const empresa = tipo === 'NIT'
  const identificationObject = { type: tipo, number: numero }
  if (empresa) identificationObject.dv = String(cliente.dv ?? digitoVerificacion(numero))

  const contacto = {
    identificationObject,
    kindOfPerson: empresa ? 'LEGAL_ENTITY' : 'PERSON_ENTITY',
    regime: cliente.regimen || (empresa ? 'COMMON_REGIME' : 'SIMPLIFIED_REGIME'),
    email: cliente.emailFactura || cliente.email,
    address: direccionAlegra(envio),
    type: ['client'],
  }
  if (cliente.telefono) contacto.phonePrimary = cliente.telefono
  if (Array.isArray(cliente.responsabilidades) && cliente.responsabilidades.length) {
    contacto.fiscalResponsabilities = cliente.responsabilidades
  }

  if (empresa) {
    contacto.name = cliente.razonSocial || cliente.nombre
  } else {
    let nombres = cliente.nombres
    let apellidos = cliente.apellidos
    if (!nombres) {
      const partes = String(cliente.nombre || '').trim().split(/\s+/)
      nombres = partes.shift() || 'Cliente'
      apellidos = partes.join(' ')
    }
    contacto.nameObject = { firstName: nombres, lastName: apellidos || nombres }
  }
  return contacto
}

// Con "Datos de empresa" en el checkout, la factura va a nombre de la
// empresa (NIT); el nombre, correo y teléfono siguen siendo de quien compra.
function clienteFiscal(cliente) {
  const e = cliente?.empresa
  if (!e?.nit) return cliente
  return {
    ...cliente,
    tipoDocumento: 'NIT',
    documento: e.nit,
    dv: digitoVerificacion(e.nit),   // el DV no se le cree al navegador: es un cálculo
    razonSocial: e.razonSocial,
    // "No estoy seguro" -> responsable, como la mayoría de empresas en Alegra.
    regimen: e.regimen === 'SIMPLIFIED_REGIME' ? 'SIMPLIFIED_REGIME' : 'COMMON_REGIME',
    // La factura va al correo de la empresa si lo dio (p. ej. contabilidad).
    emailFactura: e.correo || cliente.emailFactura,
    telefono: e.celular || cliente.telefono,
  }
}

// Busca el cliente por documento; si no existe lo crea. A los que ya existen
// no se les cambia nada: la tienda puede haberlos corregido a mano.
async function obtenerCliente(clienteCheckout, envio) {
  const cliente = clienteFiscal(clienteCheckout)
  const numero = numeroDocumento(cliente)
  if (!numero) throw new Error('El pedido no tiene documento del cliente')

  const encontrados = await llamarAlegra(`contacts?identification=${encodeURIComponent(numero)}`)
  if (Array.isArray(encontrados) && encontrados.length) return encontrados[0].id

  const contacto = contactoDesdeCliente(cliente, envio)
  try {
    return (await llamarAlegra('contacts', { method: 'POST', body: contacto })).id
  } catch (e) {
    // Lo más probable es que el municipio no tenga el nombre exacto que
    // espera Alegra. Se crea sin ciudad: la tienda la completa si hace falta.
    if (e.status !== 400 || !contacto.address.city) throw e
    console.warn(`[Alegra] Contacto rechazado con ciudad "${contacto.address.city}", reintento sin ciudad:`, e.message)
    const { city, department, ...sinCiudad } = contacto.address
    return (await llamarAlegra('contacts', { method: 'POST', body: { ...contacto, address: sinCiudad } })).id
  }
}

// Medio de pago para la DIAN según lo que reporta Wompi (CARD, PSE, NEQUI...).
function medioDePago(metodoWompi) {
  return metodoWompi === 'CARD' ? 'CREDIT_CARD' : 'DEBIT_TRANSFER'
}

// ------------------------------------------------------------
// Crea la factura del pedido y devuelve lo que se guarda en pedidos.factura:
// { id, numero, estado ('borrador' | 'emitida'), estadoDian, creadaEn }
// ------------------------------------------------------------
async function generarFactura(pedido) {
  const { referencia, cliente, envio, carrito, metodoPago } = pedido
  const emitir = emitirFacturas()

  // Descuento por compra grande: % por línea de producto (el envío no lleva).
  const descuentoPct = Number(pedido.descuento?.porcentaje) || 0
  const items = (carrito || []).map((item) => ({
    id: String(item.productoId),
    price: Number(item.precio),
    quantity: Number(item.cantidad),
    ...(descuentoPct > 0 ? { discount: descuentoPct } : {}),
    ...(item.variante ? { description: item.variante } : {}),
  }))

  const costoEnvio = Number(envio?.costo) || 0
  if (costoEnvio > 0) {
    const itemEnvio = process.env.ALEGRA_ITEM_ENVIO
    if (!itemEnvio) throw new Error('Falta ALEGRA_ITEM_ENVIO para facturar el envío')
    const detalle = [envio.transportadora, envio.ciudad].filter(Boolean).join(' · ')
    items.push({
      id: String(itemEnvio),
      price: costoEnvio,
      quantity: 1,
      ...(detalle ? { description: detalle } : {}),
    })
  }

  const fecha = hoyColombia()
  const factura = {
    date: fecha,
    dueDate: fecha,
    client: { id: await obtenerCliente(cliente, envio) },
    items,
    paymentForm: 'CASH',
    paymentMethod: medioDePago(metodoPago),
    status: emitir ? 'open' : 'draft',
    anotation: `Pedido tienda en línea ${referencia}`,
  }
  // Un borrador en Alegra SÍ gasta el consecutivo de su numeración (probado
  // el 2026-10-10: PL418 quedó en un borrador). Por eso los borradores van a
  // la numeración "Principal" (no electrónica) y no dejan huecos en la PL.
  const numeracion = emitir
    ? process.env.ALEGRA_NUMERACION
    : (process.env.ALEGRA_NUMERACION_BORRADOR || '1')
  if (numeracion) factura.numberTemplate = { id: numeracion }
  if (emitir) factura.stamp = { generateStamp: true }

  let creada
  try {
    creada = await llamarAlegra('invoices', { method: 'POST', body: factura })
  } catch (e) {
    // Si falla la emisión, Alegra igual deja la factura creada (en borrador)
    // y la devuelve junto al error. Se guarda para no duplicarla al reintentar.
    const enError = e.datos?.invoice || e.datos?.data
    if (!enError?.id) throw e
    console.error(`[Alegra] Factura ${enError.id} de ${referencia} creada pero no emitida:`, e.message)
    creada = enError
  }

  const resultado = {
    id: String(creada.id),
    numero: creada.numberTemplate?.fullNumber || null,
    estado: creada.status === 'draft' ? 'borrador' : 'emitida',
    estadoDian: creada.stamp?.legalStatus || null,
    creadaEn: new Date().toISOString(),
  }
  console.log(`🧾 [Alegra] Factura ${resultado.numero || resultado.id} (${resultado.estado}) para ${referencia}`)
  return resultado
}


module.exports = {
  ...module.exports,
  generarFactura,
  obtenerProductos,
  digitoVerificacion,
  contactoDesdeCliente,
};
