// ============================================================
//  services/wompi.js  —  Lógica central de Wompi
// ============================================================
const crypto = require('crypto');

const WOMPI_BASE_URL     = 'https://production.wompi.co/v1';
const WOMPI_PRIVATE_KEY  = process.env.WOMPI_PRIVATE_KEY;   // prv_prod_XXXX
const WOMPI_INTEGRITY    = process.env.WOMPI_INTEGRITY;     // secreto de integridad


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
//    Fórmula: SHA256( propiedades + secreto_webhook )
// ------------------------------------------------------------
function verificarFirmaWebhook(datos, firmaRecibida) {
  const { id, status, reference, amount_in_cents, currency } = datos.transaction;

  // Wompi concatena estas propiedades en este orden exacto
  const cadena = `${id}${status}${reference}${amount_in_cents}${currency}${process.env.WOMPI_WEBHOOK_SECRET}`;
  const firmaEsperada = crypto.createHash('sha256').update(cadena).digest('hex');

  return firmaEsperada === firmaRecibida;
}


module.exports = {
  generarFirma,
  generarReferencia,
  consultarTransaccion,
  verificarFirmaWebhook
};
