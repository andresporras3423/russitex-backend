const publicarProducto = async (accessToken) => {
  const producto = {
    title: "Tela de algodón 100% - Metro",
    category_id: "MCO999",         // ← lo buscamos después
    price: 15000,
    currency_id: "COP",
    available_quantity: 50,
    buying_mode: "buy_it_now",
    condition: "new",
    listing_type_id: "gold_special",
    description: {
      plain_text: "Tela de algodón de alta calidad, ideal para confección."
    },
    pictures: [
      { source: "https://russitex.com/imagen-producto.jpg" }
    ]
  };

  const response = await fetch("https://api.mercadolibre.com/items", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(producto)
  });

  const result = await response.json();
  console.log(result);
  return result;
};

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