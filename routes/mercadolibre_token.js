const express = require('express')
const router = express.Router()


const {upsert} = require('../database/supabase')

// POST /api/mercadolibre/auth
router.post("/mercadolibre_token", async (req, res) => {
  const { code } = req.body;

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI
    })
  });

  const tokens = await response.json();
console.log(tokens);
  // Guarda en DB o en .env / archivo
await upsert("ml_tokens", {
  id: 1,
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expires_at: Date.now() + (tokens.expires_in * 1000)
});

  res.json({ message: "Tokens guardados correctamente" });
});

module.exports = router
