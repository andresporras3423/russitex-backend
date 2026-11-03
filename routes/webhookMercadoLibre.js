// ============================================================
//  routes/webhookMercadoLibre.js  —  Mercado Libre avisa aquí de cada venta
//
//  POST /api/webhook/mercadolibre
//  Se configura en el DevCenter de Mercado Libre (la aplicación de la
//  tienda): "URL de retorno de notificaciones" = esta URL, tema "orders_v2".
//
//  La notificación no trae firma, solo el recurso que cambió
//  ({ topic, resource: '/orders/123', user_id, ... }). No hace falta
//  creerle: la orden se vuelve a pedir a Mercado Libre con el token de la
//  tienda, así que un aviso falso no puede inventar una venta.
//
//  Hay que responder 200 rápido (si no, Mercado Libre reintenta y luego
//  deja de avisar), así que la factura se hace después de responder.
// ============================================================
const express = require('express')
const router = express.Router()
const { facturarVenta } = require('../services/ventasMercadoLibre')

router.post('/', (req, res) => {
  res.sendStatus(200)
  const { topic, resource, application_id } = req.body || {}
  if (topic !== 'orders_v2') return
  if (String(application_id) !== String(process.env.ML_CLIENT_ID)) return
  const ordenId = /^\/orders\/(\d+)$/.exec(resource || '')?.[1]
  if (!ordenId) return
  facturarVenta(ordenId)
    .then((r) => console.log(`🛒 [Mercado Libre] Orden ${ordenId}: venta ${r.packId} ${r.estado}${r.factura ? `, factura ${r.factura.numero || r.factura.id} (${r.factura.estado})` : ''}`))
    .catch((e) => console.error(`❌ [Mercado Libre] Orden ${ordenId}:`, e.message))
})

module.exports = router
