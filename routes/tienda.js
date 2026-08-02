// ============================================================
//  routes/tienda.js
//
//  GET /api/tienda
//
//  Devuelve la información del local marcada como visible_web,
//  como un mapa clave -> valor listo para pintar en la web.
//
//  Misma fuente que usa el prompt del bot, así el footer nunca
//  puede contradecir lo que el bot responde.
// ============================================================
const express = require('express')
const router  = express.Router()
const { obtenerInfoTienda } = require('../services/tienda')

router.get('/', async (req, res) => {
  try {
    const filas = await obtenerInfoTienda({ forzar: req.query.refrescar === '1' })
    const info = {}
    for (const f of filas) {
      if (f.visible_web) info[f.clave] = f.valor
    }
    res.json({ info })
  } catch (e) {
    console.error('[tienda] Error leyendo tienda_info:', e.message)
    res.status(502).json({ error: 'No se pudo obtener la información del almacén.' })
  }
})

module.exports = router
