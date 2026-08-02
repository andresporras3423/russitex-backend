// ============================================================
//  services/alegra.js  —  Integración con Alegra
//
//  - obtenerProductos(): lee el catálogo (nombres y precios).
//    Alegra es la fuente de verdad de nombre/precio; la categoría
//    y la imagen viven en Supabase (Alegra no puede guardarlas).
//  - generarFactura(): factura electrónica al aprobarse un pago.
// ============================================================

const ALEGRA_API_URL = 'https://api.alegra.com/api/v1';
const ALEGRA_USUARIO = process.env.ALEGRA_USUARIO;
const ALEGRA_TOKEN   = process.env.ALEGRA_TOKEN;

function authHeader() {
  if (!ALEGRA_USUARIO || !ALEGRA_TOKEN) {
    throw new Error('Faltan ALEGRA_USUARIO o ALEGRA_TOKEN en el archivo .env')
  }
  return 'Basic ' + Buffer.from(`${ALEGRA_USUARIO}:${ALEGRA_TOKEN}`).toString('base64')
}

// Alegra devuelve el precio de dos formas según la cuenta: un número suelto,
// o un arreglo de listas de precios. Normalizamos ambos casos.
function normalizarPrecio(price) {
  if (typeof price === 'number') return price
  if (typeof price === 'string' && price.trim() !== '') return Number(price)
  if (Array.isArray(price) && price.length > 0) {
    const p = price[0]
    const valor = typeof p === 'object' ? (p.price ?? p.value) : p
    return Number(valor) || 0
  }
  if (price && typeof price === 'object') return Number(price.price ?? price.value) || 0
  return 0
}

// Alegra devuelve la unidad en inglés ('meter', 'unit'...). La pasamos al
// texto que muestra la web. Si en productos_meta cargaste una unidad propia,
// esa tiene prioridad sobre esta traducción.
const UNIDADES = {
  meter: 'Por metro',
  metro: 'Por metro',
  unit:  'Por unidad',
  pair:  'Por par',
  box:   'Por caja',
  kit:   'Por caja',
}

function normalizarItem(item) {
  const unidadCruda = item.inventory?.unit ?? item.unit ?? null
  return {
    alegraId: String(item.id),
    nombre:   item.name,
    // Alegra guarda los precios con decimales (son valores sin IVA).
    // En pesos colombianos no se muestran centavos, así que redondeamos.
    precio:   Math.round(normalizarPrecio(item.price)),
    unidadAlegra: unidadCruda ? (UNIDADES[unidadCruda] || unidadCruda) : null,
    activo:   item.status !== 'inactive',
  }
}

// ------------------------------------------------------------
// Trae TODOS los ítems, paginando hasta que Alegra deje de
// devolver resultados (por defecto la API pagina de a pocos).
// ------------------------------------------------------------
async function obtenerProductos({ limit = 30 } = {}) {
  const todos = []
  let start = 0

  // Tope de seguridad para no quedarnos en un bucle infinito si la API
  // ignorara el parámetro `start` y devolviera siempre la misma página.
  const MAX_PAGINAS = 50

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const url = `${ALEGRA_API_URL}/items?limit=${limit}&start=${start}`
    const res = await fetch(url, {
      headers: { Authorization: authHeader(), Accept: 'application/json' },
    })

    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      throw new Error(`Alegra respondió ${res.status} al pedir productos. ${detalle.slice(0, 200)}`)
    }

    const lote = await res.json()
    if (!Array.isArray(lote) || lote.length === 0) break

    todos.push(...lote)
    if (lote.length < limit) break   // última página
    start += limit
  }

  return todos.map(normalizarItem)
}

async function generarFactura({ referencia, cliente, carrito, totalPesos, metodoPago }) {
  const items = carrito.map(item => ({
    id:       item.productoId,
    name:     item.nombre,
    price:    item.precio,
    quantity: item.cantidad
  }));

  // TODO: implementar llamada real a Alegra cuando tengas el token
  // const response = await fetch(`${ALEGRA_API_URL}/invoices`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Basic ${ALEGRA_TOKEN_BASE64}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     date: new Date().toISOString().split('T')[0],
  //     dueDate: new Date().toISOString().split('T')[0],
  //     client: {
  //       name:  cliente.nombre,
  //       email: cliente.email
  //     },
  //     items,
  //     notes: `Pedido ${referencia} — Pago via ${metodoPago}`,
  //     send: true  // Alegra envía la factura al correo del cliente automáticamente
  //   })
  // });

  console.log(`🧾 [Alegra] Factura generada para pedido ${referencia}`);
  console.log(`   Cliente: ${cliente.nombre} (${cliente.email})`);
  console.log(`   Total: $${totalPesos.toLocaleString('es-CO')} COP | Método: ${metodoPago}`);
}


module.exports = {
  ...module.exports,
  generarFactura,
  obtenerProductos
};
