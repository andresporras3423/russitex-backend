const express = require('express')
const router = express.Router()

const { getTokensFromDB, upsert } = require('../database/supabase')

router.post("/publicaciones", async (req, res) => {
  // 1. Obtiene token de la DB
  let { access_token, refresh_token, expires_at } = await getTokensFromDB()

  // 2. Renueva si está vencido
  if (Date.now() > expires_at) {
    const response = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token  // ✅ snake_case
      })
    })
    const newTokens = await response.json()
    access_token = newTokens.access_token  // 👈 faltaba esto
    await upsert("ml_tokens", {
      id: 1,
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: Date.now() + (newTokens.expires_in * 1000)
    })
  }

 // 3. Publica el producto
const { title, categoryId, price, quantity, description, pictures, listingType, attributes } = req.body  // 👈 agrega attributes

const response = await fetch("https://api.mercadolibre.com/items", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${access_token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title,
    category_id: categoryId,
    price,
    currency_id: "COP",
    available_quantity: quantity,
    buying_mode: "buy_it_now",
    condition: "new",
    listing_type_id: listingType || "gold_special",
    status: "paused",                              // 👈 agrega esto
    description: { plain_text: description || "" },
    pictures: pictures?.map(url => ({ source: url })) || [],
    attributes: attributes || []                   // 👈 agrega esto
  })
})

  const data = await response.json()
  res.status(201).json({ itemId: data.id, permalink: data.permalink, data })
})

module.exports = router