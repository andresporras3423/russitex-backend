const getAccessToken = async (code) => {
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "8795678375203447",
      client_secret: "tu_client_secret",
      code: code,
      redirect_uri: "https://russitex.com"
    })
  });

  const tokens = await response.json();
  console.log(tokens);
  // Guarda tokens.access_token y tokens.refresh_token
  return tokens;
};