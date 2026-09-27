// ============================================================
//  routes/envios.js
//
//  POST /api/envios/cotizar
//
//  Calcula el paquete de un carrito y (si Envia está configurado)
//  devuelve el costo del envío más barato al destino.
//
//  Body:
//  {
//    carrito: [ { productoId: "44", cantidad: 3 }, ... ],
//    destino: { codigoDane, valorDeclarado }
//  }
//
//  El peso y el volumen NO se toman del cliente: se resuelven acá contra
//  el catálogo (productos_meta), para que nadie pueda falsear el envío.
// ============================================================
const express = require('express')
const router  = express.Router()
const { resolverCarrito, cotizarEnvio, obtenerCiudades } = require('../services/envios')

// GET /api/envios/ciudades — lista de municipios (nombre + código DANE) para
// el selector del checkout.
router.get('/ciudades', async (req, res) => {
  try {
    const resultado = await obtenerCiudades()
    res.json(resultado)
  } catch (e) {
    console.error('[envios] Error trayendo ciudades:', e.message)
    res.status(502).json({ error: 'No se pudo obtener la lista de municipios. ' + e.message })
  }
})

router.post('/cotizar', async (req, res) => {
  try {
    const { carrito, destino } = req.body || {}
    if (!Array.isArray(carrito) || carrito.length === 0) {
      return res.status(400).json({ error: 'Falta el carrito.' })
    }

    const { lineas, desconocidos } = await resolverCarrito(carrito)
    const resultado = await cotizarEnvio({ carrito: lineas, destino })
    res.json({ ...resultado, productosDesconocidos: desconocidos })
  } catch (e) {
    console.error('[envios] Error cotizando:', e.message)
    res.status(500).json({ error: 'No se pudo cotizar el envío. ' + e.message })
  }
})

module.exports = router
