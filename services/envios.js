// ============================================================
//  services/envios.js  —  Integración con MiPaquete
//
//  Solicita la recolección automáticamente cuando se aprueba
//  un pago. El repartidor llega a tu dirección sin que hagas nada.
// ============================================================

const MIPAQUETE_API_URL = 'https://api.mipaquete.com/v2';
const MIPAQUETE_API_KEY = process.env.MIPAQUETE_API_KEY;

// Tu dirección de despacho (donde el repartidor recoge el paquete)
const DIRECCION_ORIGEN = {
  nombre:      process.env.TIENDA_NOMBRE,
  telefono:    process.env.TIENDA_TELEFONO,
  direccion:   process.env.TIENDA_DIRECCION,
  ciudad:      process.env.TIENDA_CIUDAD,
  departamento: process.env.TIENDA_DEPARTAMENTO
};


async function solicitarRecoleccion({ referencia, cliente, envio, carrito }) {
  // Calcular peso y dimensiones sumando los productos del carrito
  const { pesoKg, largoCm, anchoCm, altoCm } = calcularDimensiones(carrito);

  // TODO: implementar llamada real a MiPaquete cuando tengas la API key
  // const response = await fetch(`${MIPAQUETE_API_URL}/shipments`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${MIPAQUETE_API_KEY}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     referencia,
  //     origen: DIRECCION_ORIGEN,
  //     destino: {
  //       nombre:    cliente.nombre,
  //       telefono:  cliente.telefono,
  //       email:     cliente.email,
  //       direccion: envio.direccion,
  //       ciudad:    envio.ciudad,
  //       departamento: envio.departamento
  //     },
  //     paquete: { pesoKg, largoCm, anchoCm, altoCm },
  //     valorDeclarado: carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  //   })
  // });

  console.log(`🚚 [MiPaquete] Recolección solicitada para pedido ${referencia}`);
  console.log(`   Destino: ${cliente.nombre} — ${envio.direccion}, ${envio.ciudad}`);
  console.log(`   Paquete: ${pesoKg}kg | ${largoCm}x${anchoCm}x${altoCm} cm`);
}


function calcularDimensiones(carrito) {
  // Cada producto debe tener peso_gramos, largo_cm, ancho_cm, alto_cm en tu BD
  // Por ahora usamos valores de ejemplo
  let pesoTotal = 0;
  let largoMax  = 0;
  let anchoMax  = 0;
  let altoTotal = 0;

  for (const item of carrito) {
    const pesoGramos = item.peso_gramos || 300;  // fallback: 300g por producto
    const largo      = item.largo_cm    || 30;
    const ancho      = item.ancho_cm    || 25;
    const alto       = item.alto_cm     || 5;

    pesoTotal += pesoGramos * item.cantidad;
    largoMax   = Math.max(largoMax, largo);
    anchoMax   = Math.max(anchoMax, ancho);
    altoTotal += alto * item.cantidad;             // los productos se apilan
  }

  return {
    pesoKg:  Math.ceil(pesoTotal / 1000 * 10) / 10,  // redondear al 0.1kg superior
    largoCm: largoMax,
    anchoCm: anchoMax,
    altoCm:  altoTotal
  };
}


module.exports = { solicitarRecoleccion };


