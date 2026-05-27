const getTokenFromDB = require('../database/supabase')

// POST /api/mercadolibre/publicaciones
router.post("/publicaciones", async (req, res) => {
  // 1. Obtiene token de la DB
  let { accessToken, refreshToken, expiresAt } = await getTokenFromDB();

  // 2. Renueva si está vencido
  if (Date.now() > expiresAt) {
    const r = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    const newTokens = await r.json();
    accessToken = newTokens.access_token;
    await saveTokensToDB({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: Date.now() + (newTokens.expires_in * 1000)
    });
  }

  // 3. Publica el producto
  const { title, categoryId, price, quantity, description, pictures, listingType } = req.body;

  const response = await fetch("https://api.mercadolibre.com/items", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
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
      description: { plain_text: description || "" },
      pictures: pictures?.map(url => ({ source: url })) || []
    })
  });

  const data = await response.json();
  res.status(201).json({ itemId: data.id, permalink: data.permalink, data });
});
