// ============================================================
//  routes/pedidos.js  —  "Mis pedidos" en Mi cuenta
//
//  GET /api/pedidos/mios
//
//  Devuelve los pedidos hechos con el correo de la cuenta que inició
//  sesión. Requiere el correo VERIFICADO: si no, cualquiera podría crear
//  una cuenta con el correo de otra persona y ver sus pedidos.
// ============================================================
const express       = require('express')
const router        = express.Router()
const verificarAuth = require('../middleware/verificarAuth')
const pedidos       = require('../services/pedidos')
const { categoriaDeEstado } = require('../services/envios')

// Estado del pedido + estado del envío -> lo que ve el cliente (mismos
// nombres y colores que la maqueta de Mi cuenta).
const AVANCE_ENVIO = {
  en_camino:  'En camino',
  en_reparto: 'Sale hoy a reparto',
  en_oficina: 'En la oficina de la transportadora',
  novedad:    'Con una novedad: te contactaremos',
}

function estadoParaCliente(p) {
  if (p.estado === 'PENDIENTE') return { clave: 'pago_pendiente', texto: 'Pago pendiente', color: 'ambar', pago: 'Pendiente' }
  if (p.estado === 'RECHAZADO' || p.estado === 'ERROR') return { clave: 'rechazado', texto: 'Rechazado', color: 'rojo', pago: 'Rechazado' }
  if (p.estado === 'ANULADO') return { clave: 'cancelado', texto: 'Cancelado', color: 'rojo', pago: 'Anulado' }

  // APROBADO: el avance lo da la guía (lo actualiza el webhook de Envia).
  const categoria = categoriaDeEstado(p.guia?.estado)
  if (categoria === 'entregado') return { clave: 'entregado', texto: 'Entregado', color: 'verde', pago: 'Pagado', envio: 'Entregado' }
  if (AVANCE_ENVIO[categoria]) return { clave: 'enviado', texto: 'Enviado', color: 'azul', pago: 'Pagado', envio: AVANCE_ENVIO[categoria] }
  if (p.guia) return { clave: 'en_preparacion', texto: 'En preparación', color: 'ambar', pago: 'Pagado', envio: 'Preparando tu pedido' }
  return { clave: 'pago_aprobado', texto: 'Pago aprobado', color: 'verde', pago: 'Pagado' }
}

router.get('/mios', verificarAuth, async (req, res) => {
  if (!req.usuario.emailConfirmado) {
    return res.status(403).json({
      error: 'Confirma tu correo para ver tus pedidos.',
      codigo: 'EMAIL_NO_VERIFICADO',
    })
  }
  try {
    const lista = await pedidos.listarPorEmail(req.usuario.email)
    res.json({
      pedidos: lista.map((p) => ({
        ...pedidos.resumenPublico(p),
        // Es su propio pedido (correo verificado): puede ver la dirección.
        direccion: p.envio?.modalidad === 'tienda' ? null : (p.envio?.direccion || null),
        estadoCliente: estadoParaCliente(p),
      })),
    })
  } catch (e) {
    console.error('[pedidos] Error listando mis pedidos:', e.message)
    res.status(500).json({ error: 'No se pudieron cargar tus pedidos.' })
  }
})

module.exports = router
module.exports.estadoParaCliente = estadoParaCliente
