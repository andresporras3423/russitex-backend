// ============================================================
//  services/cancelaciones.js  —  La tienda cancela un pedido YA PAGADO
//
//  Lo usan el panel de administrador (routes/admin.js) y el script
//  scripts/cancelar-pedido.js. El DINERO no se devuelve aquí: se hace en el
//  panel de Wompi; esto anula la guía, guarda la cancelación y avisa al
//  cliente, y devuelve la lista de lo que queda a mano.
// ============================================================
const pedidos = require('./pedidos')
const envios = require('./envios')
const notificaciones = require('./notificaciones')

class ErrorCancelacion extends Error {}

// Devuelve { cancelacion, guia: { ok, detalle, devuelto } | null, correo, pendientes[] }
async function cancelarPedido(referencia, { motivo, agotados = [] } = {}) {
  const texto = String(motivo || '').trim()
  if (texto.length < 5) throw new ErrorCancelacion('Escribe el motivo que verá el cliente.')

  const pedido = await pedidos.buscarPorReferencia(referencia)
  if (!pedido) throw new ErrorCancelacion(`No existe el pedido ${referencia}`)
  if (pedido.estado !== 'APROBADO') throw new ErrorCancelacion(`El pedido está ${pedido.estado}: solo se cancelan pedidos pagados.`)
  if (pedido.cancelacion) throw new ErrorCancelacion('Este pedido ya estaba cancelado.')

  // 1. Guía de Envia (solo se puede si la transportadora no la ha recogido).
  let guia = null
  if (pedido.guia?.numeroGuia) guia = await envios.cancelarEnvio(pedido.guia)

  // 2. Cancelación en el pedido
  const cancelacion = {
    motivo: texto,
    agotados: agotados.map((a) => String(a).trim()).filter(Boolean).slice(0, 50),
    monto: pedido.totalPesos,
    estadoReembolso: 'en_proceso',
    canceladoEn: new Date().toISOString(),
    guiaCancelada: guia ? guia.ok : null,
  }
  await pedidos.guardarCancelacion(referencia, cancelacion)

  // 3. Correo al cliente (nunca lanza error)
  const correo = await notificaciones.avisarPedidoCancelado({ ...pedido, cancelacion })

  // 4. Lo que queda a mano
  const pendientes = [`Devolver $${Number(pedido.totalPesos).toLocaleString('es-CO')} en el panel de Wompi (transacción ${pedido.transaccionId || 'ver por referencia'}).`]
  if (guia && !guia.ok) pendientes.push(`La guía ${pedido.guia.numeroGuia} no se pudo cancelar (${guia.detalle}). Si la transportadora ya recogió el paquete, gestiónalo con Envia.`)
  if (pedido.factura?.estado === 'emitida') pendientes.push(`Hacer una nota crédito en Alegra a la factura ${pedido.factura.numero}.`)
  else if (pedido.factura) pendientes.push(`Borrar en Alegra el borrador de factura ${pedido.factura.numero || pedido.factura.id}.`)
  if (!correo) pendientes.push('No se pudo enviar el correo al cliente: avísale por WhatsApp.')

  return { cancelacion, guia, correo, pendientes }
}

async function marcarReembolsado(referencia) {
  const pedido = await pedidos.buscarPorReferencia(referencia)
  if (!pedido) throw new ErrorCancelacion(`No existe el pedido ${referencia}`)
  if (!pedido.cancelacion) throw new ErrorCancelacion('El pedido no está cancelado.')
  if (pedido.cancelacion.estadoReembolso === 'reembolsado') return pedido.cancelacion
  const cancelacion = { ...pedido.cancelacion, estadoReembolso: 'reembolsado', reembolsadoEn: new Date().toISOString() }
  await pedidos.guardarCancelacion(referencia, cancelacion)
  return cancelacion
}

module.exports = { cancelarPedido, marcarReembolsado, ErrorCancelacion }
