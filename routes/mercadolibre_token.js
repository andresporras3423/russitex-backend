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

  // Guarda en DB o en .env / archivo
  await saveTokensToDB({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000)
  });

  res.json({ message: "Tokens guardados correctamente" });
});