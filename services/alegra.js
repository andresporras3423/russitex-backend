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

// ------------------------------------------------------------
//  DISPONIBILIDAD — por qué NO se usa el inventario de Alegra
//
//  Decidido con Oscar el 2026-08-23, después de probarlo encendido.
//
//  Los números de Alegra no sirven, y el motivo es preciso: las VENTAS
//  se registran (por eso baja), pero las COMPRAS no (nadie anota cuando
//  llega mercancía). Así quedan:
//        entretela doble punto -> inicial 1    disponible -3366.4
//        Hombrera en algodón   -> inicial 500  disponible  -804
//        Sido                  -> inicial 10000 disponible 9889.1
//    y los otros 36 con initialQuantity = 99999, el relleno de Alegra.
//
//  No es un problema de variantes: Alegra factura un ítem por producto,
//  no por color. Partir un producto en varios códigos de Alegra daría
//  varios contadores negativos en vez de uno.
//
//  Por eso la disponibilidad es un BOOLEANO MANUAL en Supabase:
//      productos_meta.disponible        -> el producto entero
//      producto_variantes.disponible    -> cada color / estampado
//
//  Equivocarse hacia "hay" sale más barato que hacia "no hay": un
//  "Agotado" falso pierde la venta en silencio; un "disponible" falso
//  termina en una conversación por WhatsApp, que iba a pasar igual.
//
//  PENDIENTE: una pantalla de administración para marcar esto. Si hay
//  que entrar al panel de Supabase a editar filas, nadie lo va a hacer
//  y la web va a mentir igual que Alegra.
//
//  Si algún día en Alegra se registran también las compras, poner esta
//  constante en true y el mecanismo revive solo: la ficha y el bot ya
//  soportan el estado agotado.
// ------------------------------------------------------------
const USAR_INVENTARIO_ALEGRA = false

const CANTIDAD_PLACEHOLDER = 9999

function disponibilidad(item) {
  if (!USAR_INVENTARIO_ALEGRA) return { disponible: true, stockReal: false }

  const cantidad = Number(
    item.inventory?.availableQuantity ?? item.inventory?.initialQuantity ?? NaN
  )
  // Sin dato, o el relleno de Alegra: no sabemos, así que no decimos que falta.
  if (!Number.isFinite(cantidad) || cantidad >= CANTIDAD_PLACEHOLDER) {
    return { disponible: true, stockReal: false }
  }
  return { disponible: cantidad > 0, stockReal: true }
}

function normalizarItem(item) {
  const unidadCruda = item.inventory?.unit ?? item.unit ?? null
  const { disponible, stockReal } = disponibilidad(item)
  return {
    alegraId: String(item.id),
    nombre:   item.name,
    // Alegra guarda los precios con decimales (son valores sin IVA).
    // En pesos colombianos no se muestran centavos, así que redondeamos.
    precio:   Math.round(normalizarPrecio(item.price)),
    unidadAlegra: unidadCruda ? (UNIDADES[unidadCruda] || unidadCruda) : null,
    activo:   item.status !== 'inactive',
    disponible,
    // Le sirve al bot para saber si puede hablar de disponibilidad.
    stockReal,
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
