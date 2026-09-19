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
// Descontar stock de los productos vendidos.
// TODO (tarea aparte): conectar con el inventario real. Por ahora loguea.
// ------------------------------------------------------------
async function descontarStock(carrito) {
  for (const item of carrito || []) {
    console.log(`📦 Stock por descontar: ${item.cantidad}x "${item.nombre}" (ID: ${item.productoId})`)
  }
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
  descontarStock,
  listarTodos,
}
