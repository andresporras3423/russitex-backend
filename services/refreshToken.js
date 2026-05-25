const refreshAccessToken = async (refreshToken) => {
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "8795678375203447",
      client_secret: "tu_client_secret",
      refresh_token: refreshToken
    })
  });

  return await response.json();
}; 