// ============================================================
//  routes/productos.js
//
//  GET /api/productos
//
//  Devuelve el catálogo público ya unido (Alegra + Supabase).
//  Toda la lógica vive en services/catalogo.js, para que el bot
//  Rusti use exactamente la misma y no puedan divergir.
//
//  ?refrescar=1  salta la caché de 24 horas.
// ============================================================
const express = require('express')
const router  = express.Router()
const { obtenerCatalogo } = require('../services/catalogo')

router.get('/', async (req, res) => {
  try {
    const resultado = await obtenerCatalogo({ forzar: req.query.refrescar === '1' })
    res.json(resultado)
  } catch (e) {
    console.error('[productos] Error construyendo el catálogo:', e.message)
    res.status(502).json({ error: 'No se pudo obtener el catálogo. ' + e.message })
  }
})

module.exports = router
