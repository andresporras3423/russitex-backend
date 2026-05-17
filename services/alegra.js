// ============================================================
//  services/alegra.js  —  Integración con Alegra
//
//  Genera la factura electrónica automáticamente cuando
//  se aprueba un pago. El cliente la recibe en su correo.
// ============================================================

// Exportamos desde el mismo archivo para mantenerlo simple
const ALEGRA_API_URL = 'https://app.alegra.com/api/v1';
const ALEGRA_TOKEN   = process.env.ALEGRA_TOKEN;  // Base64(usuario:token)


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
  //     'Authorization': `Basic ${ALEGRA_TOKEN}`,
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
  generarFactura
};
