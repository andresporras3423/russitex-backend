// ============================================================
//  services/pedidos.js  —  Gestión de pedidos en Supabase
//
//  Antes esto era un Map en memoria (se perdía al reiniciar). Ahora
//  persiste en la tabla `pedidos` (ver database/pedidos.sql).
//
//  Se usa el cliente service_role (supabaseAdmin) porque la tabla tiene
//  RLS cerrada: guarda datos personales del cliente y solo el backend
//  debe tocarla.
//
//  Las funciones conservan su firma y la forma del objeto (camelCase)
//  para no tener que tocar routes/pagos.js ni routes/webhook.js.
// ============================================================
const { supabaseAdmin } = require('../database/supabaseAdmin')

// Traduce una fila de la BD (snake_case) al objeto que usa el resto del
// código (camelCase): pedido.totalPesos, pedido.transaccionId, etc.
function aPedido(fila) {
  if (!fila) return null
  return {
    referencia:    fila.referencia,
    estado:        fila.estado,
    cliente:       fila.cliente,
    envio:         fila.envio,
    carrito:       fila.carrito,
    totalPesos:    fila.total_pesos,
    transaccionId: fila.transaccion_id,
    metodoPago:    fila.metodo_pago,
    fechaPago:     fila.fecha_pago,
    guia:          fila.guia ?? null,
    creadoEn:      fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  }
}


// ------------------------------------------------------------
// Crear pedido con estado PENDIENTE.
// Se llama antes de mostrar el widget de Wompi al usuario.
// ------------------------------------------------------------
async function crearPendiente({ referencia, carrito, cliente, envio, totalPesos }) {
  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .insert({
      referencia,
      estado: 'PENDIENTE',
      cliente,
      envio,
      carrito,
      total_pesos: totalPesos,
    })
    .select()
    .single()

  if (error) throw new Error(`No se pudo crear el pedido ${referencia}: ${error.message}`)
  console.log(`📝 Pedido creado: ${referencia} | Total: $${Number(totalPesos).toLocaleString('es-CO')}`)
  return aPedido(data)
}


// ------------------------------------------------------------
// Actualizar estado de un pedido.
// Se llama desde el webhook cuando Wompi confirma el pago.
// datosPago puede traer: transaccionId, metodoPago, fechaPago.
// ------------------------------------------------------------
async function actualizarEstado(referencia, nuevoEstado, datosPago = {}) {
  const cambios = { estado: nuevoEstado, actualizado_en: new Date().toISOString() }
  if (datosPago.transaccionId !== undefined) cambios.transaccion_id = datosPago.transaccionId
  if (datosPago.metodoPago !== undefined)    cambios.metodo_pago    = datosPago.metodoPago
  if (datosPago.fechaPago !== undefined)     cambios.fecha_pago     = datosPago.fechaPago

  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .update(cambios)
    .eq('referencia', referencia)
    .select()

  if (error) throw new Error(`No se pudo actualizar el pedido ${referencia}: ${error.message}`)
  if (!data || data.length === 0) throw new Error(`Pedido ${referencia} no existe en la BD`)
  return aPedido(data[0])
}


// ------------------------------------------------------------
// Buscar pedido por referencia. Devuelve null si no existe.
// ------------------------------------------------------------
async function buscarPorReferencia(referencia) {
  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .select('*')
    .eq('referencia', referencia)
    .maybeSingle()

  if (error) throw new Error(`No se pudo consultar el pedido ${referencia}: ${error.message}`)
  return aPedido(data)
}


// ------------------------------------------------------------
// Reservar la logística post-pago de un pedido (una sola vez).
// Marca logistica_procesada_en solo si estaba vacío, en un único UPDATE,
// así dos webhooks simultáneos (Wompi reintenta) no la disparan dos veces.
// Devuelve true si este llamado la reservó, false si ya estaba hecha.
// ------------------------------------------------------------
async function reservarLogistica(referencia) {
  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .update({ logistica_procesada_en: new Date().toISOString() })
    .eq('referencia', referencia)
    .is('logistica_procesada_en', null)
    .select('referencia')

  if (error) throw new Error(`No se pudo reservar la logística de ${referencia}: ${error.message}`)
  return data.length > 0
}


// ------------------------------------------------------------
// Liberar la reserva si la logística falló, para que el reintento de
// Wompi la vuelva a intentar.
// ------------------------------------------------------------
async function liberarLogistica(referencia) {
  const { error } = await supabaseAdmin()
    .from('pedidos')
    .update({ logistica_procesada_en: null })
    .eq('referencia', referencia)

  if (error) console.error(`No se pudo liberar la logística de ${referencia}: ${error.message}`)
}


// ------------------------------------------------------------
// Buscar el pedido de una guía de envío. Devuelve null si no existe.
// ------------------------------------------------------------
async function buscarPorGuia(numeroGuia) {
  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .select('*')
    .eq('guia->>numeroGuia', numeroGuia)
    .maybeSingle()

  if (error) throw new Error(`No se pudo buscar la guía ${numeroGuia}: ${error.message}`)
  return aPedido(data)
}


// ------------------------------------------------------------
// Guardar la guía de envío (número, etiqueta PDF, rastreo) en el pedido.
// ------------------------------------------------------------
async function guardarGuia(referencia, guia) {
  const { error } = await supabaseAdmin()
    .from('pedidos')
    .update({ guia, actualizado_en: new Date().toISOString() })
    .eq('referencia', referencia)

  if (error) throw new Error(`No se pudo guardar la guía de ${referencia}: ${error.message}`)
}


// ------------------------------------------------------------
// Descontar stock de los productos vendidos.
// TODO (tarea aparte): conectar con el inventario real. Por ahora loguea.
// ------------------------------------------------------------
async function descontarStock(carrito) {
  for (const item of carrito || []) {
    console.log(`📦 Stock por descontar: ${item.cantidad}x "${item.nombre}" (ID: ${item.productoId})`)
  }
}


// ------------------------------------------------------------
// Lo que ve la página de confirmación. A propósito NO lleva datos de
// contacto ni la dirección: estas rutas se consultan solo con la
// referencia o el id de la transacción. Esos datos los guarda el propio
// navegador al pagar (sessionStorage en CheckoutPage).
// ------------------------------------------------------------
function resumenPublico(pedido, { estado, metodoPago } = {}) {
  const envio = pedido.envio || {};
  return {
    referencia: pedido.referencia,
    estado:     estado || pedido.estado,   // PENDIENTE | APROBADO | RECHAZADO | ANULADO | ERROR
    total:      pedido.totalPesos,
    cliente:    pedido.cliente?.nombre,
    modalidad:  envio.modalidad || null,   // domicilio | tienda
    creadoEn:   pedido.creadoEn,
    metodoPago: pedido.metodoPago || metodoPago || null,   // CARD | PSE | NEQUI | ...
    productos:  (pedido.carrito || []).map((i) => ({
      productoId: i.productoId, nombre: i.nombre, variante: i.variante || null,
      cantidad: i.cantidad, precio: i.precio,
    })),
    envio: {
      costo:          Number(envio.costo) || 0,
      envioGratis:    Boolean(envio.envioGratis),
      ciudad:         envio.ciudad || null,
      departamento:   envio.departamento || null,
      codigoDane:     envio.codigoDane || null,
      transportadora: envio.transportadora || null,
    },
    guia: pedido.guia?.numeroGuia
      ? { numeroGuia: pedido.guia.numeroGuia, rastreoUrl: pedido.guia.rastreoUrl || null }
      : null,
  };
}


// ------------------------------------------------------------
// Pedidos hechos con un correo (para "Mis pedidos"). El correo se compara
// sin distinguir mayúsculas. Los PENDIENTE de más de 24 h no se devuelven:
// casi siempre son pagos que el cliente abandonó en Wompi.
// ------------------------------------------------------------
async function listarPorEmail(email) {
  const limpio = String(email || '').trim()
  if (!limpio) return []
  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .select('*')
    // ilike sin comodines: se escapan % y _ para que sea una comparación exacta.
    .ilike('cliente->>email', limpio.replace(/[%_\\]/g, (c) => `\\${c}`))
    .order('creado_en', { ascending: false })
    .limit(100)

  if (error) throw new Error(`No se pudieron listar los pedidos de ${limpio}: ${error.message}`)
  const hace24h = Date.now() - 24 * 3600 * 1000
  return (data || []).map(aPedido)
    .filter((p) => p.estado !== 'PENDIENTE' || new Date(p.creadoEn).getTime() > hace24h)
}


// ------------------------------------------------------------
// Listar todos los pedidos (para un panel de admin más adelante).
// ------------------------------------------------------------
async function listarTodos() {
  const { data, error } = await supabaseAdmin()
    .from('pedidos')
    .select('*')
    .order('creado_en', { ascending: false })

  if (error) throw new Error(`No se pudieron listar los pedidos: ${error.message}`)
  return (data || []).map(aPedido)
}


module.exports = {
  crearPendiente,
  actualizarEstado,
  buscarPorReferencia,
  reservarLogistica,
  liberarLogistica,
  buscarPorGuia,
  guardarGuia,
  descontarStock,
  listarTodos,
  listarPorEmail,
  resumenPublico,
}
