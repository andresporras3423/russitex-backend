// ============================================================
//  services/wompi.js  —  Lógica central de Wompi
// ============================================================
const crypto = require('crypto');

const WOMPI_PRIVATE_KEY  = process.env.WOMPI_PRIVATE_KEY;   // prv_prod_XXXX o prv_test_XXXX
const WOMPI_INTEGRITY    = process.env.WOMPI_INTEGRITY;     // secreto de integridad

// Las llaves de prueba (prv_test_) operan contra el entorno sandbox; las de
// producción (prv_prod_) contra production. Se elige la base según la llave
// para que consultarTransaccion apunte al lado correcto.
const WOMPI_BASE_URL = (WOMPI_PRIVATE_KEY || '').startsWith('prv_test')
  ? 'https://sandbox.wompi.co/v1'
  : 'https://production.wompi.co/v1';


// ------------------------------------------------------------
// 1. GENERAR FIRMA DE INTEGRIDAD
//    Wompi la exige para validar que el pago viene de tu tienda
//    y no de alguien que está manipulando los datos.
//    Fórmula: SHA256( referencia + monto + moneda + secreto )
// ------------------------------------------------------------
function generarFirma(referencia, montoCentavos, moneda = 'COP') {
  const cadena = `${referencia}${montoCentavos}${moneda}${WOMPI_INTEGRITY}`;
  return crypto.createHash('sha256').update(cadena).digest('hex');
}


// ------------------------------------------------------------
// 2. GENERAR REFERENCIA ÚNICA DE PEDIDO
//    Cada transacción necesita un ID único.
//    Formato: tienda-timestamp-aleatorio
// ------------------------------------------------------------
function generarReferencia() {
  const timestamp = Date.now();
  const aleatorio = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PEDIDO-${timestamp}-${aleatorio}`;
}


// ------------------------------------------------------------
// 3. CONSULTAR ESTADO DE UNA TRANSACCIÓN
//    Útil para verificar el pago desde el backend,
//    además del webhook.
// ------------------------------------------------------------
async function consultarTransaccion(transaccionId) {
  const response = await fetch(`${WOMPI_BASE_URL}/transactions/${transaccionId}`, {
    headers: {
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Error consultando transacción: ${response.status}`);
  }

  return response.json();
}


// ------------------------------------------------------------
// 4. VERIFICAR FIRMA DEL WEBHOOK
//    Cuando Wompi te avisa de un pago, debes confirmar que
//    el aviso es auténtico y no fue fabricado por alguien más.
//    Fórmula (docs de Wompi, "Eventos"):
//      SHA256( valores de signature.properties, en ese orden
//              + timestamp + secreto de eventos )
//    Las propiedades vienen como rutas dentro de evento.data, p. ej.
//    "transaction.id", "transaction.status", "transaction.amount_in_cents".
//    Wompi manda el mismo checksum en signature.checksum y en el header
//    X-Event-Checksum.
// ------------------------------------------------------------
function verificarFirmaWebhook(evento, firmaRecibida) {
  const secreto = process.env.WOMPI_WEBHOOK_SECRET;
  const propiedades = evento?.signature?.properties;
  const firma = firmaRecibida || evento?.signature?.checksum;
  if (!secreto || !Array.isArray(propiedades) || !firma || !evento.timestamp) return false;

  const valores = propiedades.map(ruta =>
    ruta.split('.').reduce((obj, clave) => obj?.[clave], evento.data)
  );
  const cadena = `${valores.join('')}${evento.timestamp}${secreto}`;
  const firmaEsperada = crypto.createHash('sha256').update(cadena).digest('hex');

  const a = Buffer.from(firmaEsperada);
  const b = Buffer.from(String(firma).toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}


module.exports = {
  generarFirma,
  generarReferencia,
  consultarTransaccion,
  verificarFirmaWebhook
};
