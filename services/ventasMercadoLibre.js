// ============================================================
//  services/ventasMercadoLibre.js  —  Factura en Alegra de cada venta
//  de Mercado Libre, y su PDF subido a la venta.
//
//  Camino normal: Mercado Libre avisa de cada venta (notificación
//  orders_v2 -> routes/webhookMercadoLibre.js) y se llama facturarVenta.
//  Red de seguridad: una pasada periódica revisa las ventas pagadas de los
//  últimos días por si alguna notificación se perdió o Alegra falló
//  (ML_CRON_MINUTOS, apagada por defecto). A mano:
//  scripts/facturar-mercadolibre.js.
//
//  Reglas:
//  - Una factura por COMPRA (pack): Mercado Libre agrupa en un pack las
//    órdenes de un mismo carrito y solo acepta una factura por pack.
//  - Solo se factura cuando todas las órdenes del pack están pagadas.
//  - El envío no se factura: con Mercado Envíos lo cobra Mercado Libre.
//  - Paquetes: si una publicación vende de a N unidades (ml_publicaciones),
//    la factura lleva las unidades reales a precio por unidad.
//  - Respeta ALEGRA_EMITIR como la web: sin "true" la factura queda en
//    borrador y no se sube nada a Mercado Libre.
//  - Si una venta ya facturada se cancela, solo se avisa en el log: la nota
//    crédito se hace a mano en Alegra.
// ============================================================
const alegra = require('./alegra')
const { ml } = require('./mercadolibreApi')
const { supabaseAdmin } = require('../database/supabaseAdmin')

const PDF_MAX_BYTES = 1024 * 1024   // límite de Mercado Libre para la factura

// Compras en proceso en este servidor: Mercado Libre puede mandar varias
// notificaciones de la misma venta casi al tiempo.
const enProceso = new Map()

async function filaVenta(packId) {
  const { data, error } = await supabaseAdmin().from('ventas_mercadolibre').select('*').eq('pack_id', packId).maybeSingle()
  if (error) throw new Error(`No se leyó la venta ${packId}: ${error.message}`)
  return data
}

async function guardarVenta(packId, cambios) {
  const { error } = await supabaseAdmin().from('ventas_mercadolibre')
    .upsert({ pack_id: packId, ...cambios, actualizado_en: new Date().toISOString() })
  if (error) throw new Error(`No se guardó la venta ${packId}: ${error.message}`)
}

async function publicaciones(itemIds) {
  const { data, error } = await supabaseAdmin().from('ml_publicaciones').select('*').in('item_id', itemIds)
  if (error) throw new Error(`No se leyó ml_publicaciones: ${error.message}`)
  return Object.fromEntries(data.map((p) => [p.item_id, p]))
}

// Datos fiscales que el comprador dio en Mercado Libre, en la forma del
// cliente del checkout de la web (lo que espera alegra.generarFactura).
// Sin datos, la factura va a consumidor final, como en el almacén.
async function clienteDeVenta(orden) {
  const idDatos = orden.buyer?.billing_info?.id
  const datos = idDatos ? (await ml(`/orders/billing-info/MCO/${idDatos}`)).buyer?.billing_info : null
  const doc = datos?.identification
  if (!doc?.number) {
    return {
      cliente: { tipoDocumento: 'CC', documento: '222222222222', nombres: 'Consumidor', apellidos: 'Final' },
      envio: {},
    }
  }
  const cliente = { tipoDocumento: doc.type, documento: doc.number, nombres: datos.name, apellidos: datos.last_name }
  if (doc.type === 'NIT') cliente.empresa = { nit: doc.number, razonSocial: datos.name }
  const dir = datos.address || {}
  const envio = {
    direccion: [dir.street_name, dir.street_number].filter(Boolean).join(' ') || undefined,
    // Alegra solo recibe la ciudad con su nombre exacto; Bogotá es la única
    // que se puede asegurar sin el código DANE.
    codigoDane: dir.state?.code === 'CO-DC' ? '11001' : undefined,
  }
  return { cliente, envio }
}

// Líneas de la factura: las del carrito de la web, una por ítem vendido.
async function carritoDeVenta(ordenes) {
  const lineas = ordenes.flatMap((o) => o.order_items)
  const pubs = await publicaciones([...new Set(lineas.map((l) => l.item.id))])
  return lineas.map((l) => {
    const pub = pubs[l.item.id]
    if (!pub) throw new Error(`La publicación ${l.item.id} no está en ml_publicaciones: no se sabe qué producto de Alegra es`)
    const paquete = pub.unidades_paquete || 1
    const variante = (l.item.variation_attributes || []).map((a) => a.value_name).filter(Boolean).join(' · ')
    return {
      productoId: pub.alegra_id,
      cantidad: l.quantity * paquete,
      precio: Math.round((l.unit_price / paquete) * 100) / 100,
      ...(variante ? { variante } : {}),
    }
  })
}

async function subirFactura(packId, factura) {
  const pdf = await alegra.pdfFactura(factura.id)
  if (pdf.length > PDF_MAX_BYTES) throw new Error(`El PDF de la factura ${factura.numero} pesa más de 1 MB`)
  const form = new FormData()
  form.append('fiscal_document', new Blob([pdf], { type: 'application/pdf' }), `Factura-${factura.numero || factura.id}.pdf`)
  try {
    const r = await ml(`/packs/${packId}/fiscal_documents`, { method: 'POST', body: form })
    return { ids: r.ids, subidaEn: new Date().toISOString() }
  } catch (e) {
    // 409: la venta ya tiene una factura cargada (p. ej. a mano desde Mercado Libre).
    if (e.status === 409) return { ids: [], yaExistia: true, subidaEn: new Date().toISOString() }
    throw e
  }
}

async function procesar(packId, ordenesIds) {
  const ordenes = await Promise.all(ordenesIds.map((id) => ml(`/orders/${id}`)))
  const total = ordenes.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const fila = await filaVenta(packId)

  const canceladas = ordenes.filter((o) => o.status === 'cancelled')
  if (canceladas.length) {
    if (fila?.factura) console.warn(`⚠️ [Mercado Libre] La venta ${packId} se canceló pero ya tiene la factura ${fila.factura.numero || fila.factura.id}: hacer la nota crédito en Alegra.`)
    await guardarVenta(packId, { ordenes: ordenesIds, estado: 'cancelada', total })
    return { packId, estado: 'cancelada' }
  }
  if (ordenes.some((o) => o.status !== 'paid')) {
    if (!fila?.factura) await guardarVenta(packId, { ordenes: ordenesIds, estado: 'pendiente', total })
    return { packId, estado: 'pendiente' }
  }

  let factura = fila?.factura
  if (!factura) {
    const { cliente, envio } = await clienteDeVenta(ordenes[0])
    const pago = ordenes[0].payments?.[0]?.payment_type
    factura = await alegra.generarFactura({
      referencia: `ML-${packId}`,
      anotacion: `Venta Mercado Libre ${packId}`,
      cliente,
      envio,
      carrito: await carritoDeVenta(ordenes),
      metodoPago: pago === 'credit_card' ? 'CARD' : pago,
    })
    await guardarVenta(packId, { ordenes: ordenesIds, estado: 'pagada', total, factura, error: null })
  }

  let subida = fila?.factura_subida
  if (!subida && factura.estado === 'emitida') {
    subida = await subirFactura(packId, factura)
    await guardarVenta(packId, { ordenes: ordenesIds, estado: 'pagada', total, factura, factura_subida: subida, error: null })
    console.log(`📎 [Mercado Libre] Factura ${factura.numero} cargada en la venta ${packId}`)
  }
  return { packId, estado: 'pagada', factura, subida: Boolean(subida) }
}

// Factura la compra a la que pertenece la orden (una sola vez).
async function facturarVenta(ordenId) {
  const orden = await ml(`/orders/${ordenId}`)
  const packId = String(orden.pack_id || orden.id)
  if (enProceso.has(packId)) return enProceso.get(packId)

  const tarea = (async () => {
    // Con pack, todas sus órdenes (solo se ven las de esta tienda).
    const ordenesIds = orden.pack_id
      ? (await ml(`/packs/${orden.pack_id}`)).orders.map((o) => String(o.id))
      : [String(orden.id)]
    try {
      return await procesar(packId, ordenesIds)
    } catch (e) {
      await guardarVenta(packId, { ordenes: ordenesIds, estado: 'error', error: e.message }).catch(() => {})
      throw e
    }
  })().finally(() => enProceso.delete(packId))
  enProceso.set(packId, tarea)
  return tarea
}

// Ventas pagadas de los últimos `dias` que todavía no tienen la factura
// completa (creada y, si se emite, subida).
async function revisarRecientes({ dias = 7 } = {}) {
  const yo = await ml('/users/me')
  const desde = new Date(Date.now() - dias * 864e5).toISOString()
  const r = await ml(`/orders/search?seller=${yo.id}&order.status=paid&order.date_created.from=${encodeURIComponent(desde)}&sort=date_desc&limit=50`)
  const resultados = []
  const vistos = new Set()
  for (const o of r.results || []) {
    const packId = String(o.pack_id || o.id)
    if (vistos.has(packId)) continue
    vistos.add(packId)
    const fila = await filaVenta(packId)
    const completa = fila?.factura && (fila.factura.estado !== 'emitida' || fila.factura_subida)
    if (completa) continue
    try {
      resultados.push(await facturarVenta(o.id))
    } catch (e) {
      console.error(`[Mercado Libre] Venta ${packId}:`, e.message)
      resultados.push({ packId, estado: 'error', error: e.message })
    }
  }
  return resultados
}

// Pasada periódica (red de seguridad). Apagada salvo ML_CRON_MINUTOS > 0.
function iniciarCronVentas() {
  const minutos = Number(process.env.ML_CRON_MINUTOS) || 0
  if (minutos <= 0) return null
  let corriendo = false
  const temporizador = setInterval(async () => {
    if (corriendo) return
    corriendo = true
    try {
      const r = await revisarRecientes()
      if (r.length) console.log(`[Mercado Libre] Pasada automática: ${r.length} ventas revisadas`)
    } catch (e) {
      console.error('[Mercado Libre] Falló la pasada automática:', e.message)
    } finally {
      corriendo = false
    }
  }, minutos * 60 * 1000)
  console.log(`[Mercado Libre] Revisión de ventas cada ${minutos} min.`)
  return temporizador
}

module.exports = { facturarVenta, revisarRecientes, iniciarCronVentas }
