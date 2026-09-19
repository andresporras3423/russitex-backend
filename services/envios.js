// ============================================================
//  services/envios.js  —  Integración con MiPaquete + cálculo del paquete
//
//  Dos responsabilidades:
//    1. calcularPaquete(carrito): a partir del peso y volumen de cada
//       producto, decide en qué bolsa/caja estándar va el pedido y con
//       qué dimensiones y peso hay que cotizar.
//    2. cotizarEnvio / solicitarRecoleccion: hablar con MiPaquete.
//
//  La transportadora cobra por el MAYOR entre el peso real y el peso
//  volumétrico = (largo × ancho × alto) / 2500.
// ============================================================

// Endpoint de MiPaquete. Producción por defecto; para pruebas se puede poner
// https://api-v2.dev.mpr.mipaquete.com en MIPAQUETE_API_URL.
const MIPAQUETE_API_URL = process.env.MIPAQUETE_API_URL || 'https://api-v2.mpr.mipaquete.com';

// Autenticación: MiPaquete pide DOS headers.
//   apikey         -> JWT que se genera con tu email+contraseña (endpoint /generateapikey)
//   session-tracker -> UUID que identifica la integración
const MIPAQUETE_API_KEY = process.env.MIPAQUETE_API_KEY;
const MIPAQUETE_SESSION_TRACKER = process.env.MIPAQUETE_SESSION_TRACKER;

// Código DANE del municipio de origen (desde donde se despacha). Bogotá = 11001000.
const ORIGEN_DANE = process.env.TIENDA_DANE;

// Datos de la dirección de origen (para solicitar la recolección más adelante).
const DIRECCION_ORIGEN = {
  nombre:       process.env.TIENDA_NOMBRE,
  telefono:     process.env.TIENDA_TELEFONO,
  direccion:    process.env.TIENDA_DIRECCION,
  ciudad:       process.env.TIENDA_CIUDAD,
  departamento: process.env.TIENDA_DEPARTAMENTO,
  codigoDane:   ORIGEN_DANE,
};

// Factor de peso volumétrico que usan las transportadoras en Colombia.
// (a veces 5000; MiPaquete usa 2500). Se deja como constante para ajustarlo.
const FACTOR_VOLUMETRICO = 2500;

// Margen que se suma para el empaque: 15% al volumen (vacíos, aire) y un
// pequeño peso por la bolsa/caja/cinta.
const HOLGURA_VOLUMEN = 1.15;

// Empaques estándar, de menor a mayor. `volumenMax` es el volumen (cm³) que
// razonablemente cabe dentro; las dimensiones son las que se envían a cotizar.
// Reemplazar por los empaques que de verdad se usen en el almacén.
const EMPAQUES = [
  { nombre: 'Bolsa chica', volumenMax: 3000,  largo: 25, ancho: 20, alto: 6,  pesoEmpaque: 0.05 },
  { nombre: 'Caja S',      volumenMax: 15000, largo: 30, ancho: 25, alto: 20, pesoEmpaque: 0.15 },
  { nombre: 'Caja M',      volumenMax: 40000, largo: 40, ancho: 30, alto: 33, pesoEmpaque: 0.25 },
  { nombre: 'Caja L',      volumenMax: 90000, largo: 60, ancho: 40, alto: 38, pesoEmpaque: 0.40 },
];
const EMPAQUE_MAYOR = EMPAQUES[EMPAQUES.length - 1];

// Valores por defecto si un producto todavía no tiene peso/volumen cargado.
const PESO_UNIT_DEFECTO = 0.20;      // kg
const VOLUMEN_UNIT_DEFECTO = 800;    // cm³

const redondearPeso = (kg) => Math.ceil(kg * 10) / 10;            // al 0.1 kg superior
const pesoVolumetrico = (l, a, h) => (l * a * h) / FACTOR_VOLUMETRICO;

// Arma un paquete a partir de un empaque estándar y el peso real de su contenido.
function armarPaquete(empaque, pesoContenidoKg) {
  const pesoReal = redondearPeso(pesoContenidoKg + empaque.pesoEmpaque);
  const volumetrico = redondearPeso(pesoVolumetrico(empaque.largo, empaque.ancho, empaque.alto));
  return {
    empaque:      empaque.nombre,
    largoCm:      empaque.largo,
    anchoCm:      empaque.ancho,
    altoCm:       empaque.alto,
    pesoRealKg:   pesoReal,
    pesoVolumetricoKg: volumetrico,
    pesoFacturableKg:  Math.max(pesoReal, volumetrico),
  };
}

/**
 * Decide en qué bolsa/caja va un pedido y con qué peso/dimensiones cotizar.
 *
 * `carrito`: [{ cantidad, pesoUnit (kg), volumenUnit (cm³) }, ...]
 *
 * Devuelve { paquetes:[...], pesoContenidoKg, volumenTotalCm3 }.
 * Casi siempre es UN solo paquete; se parte en varios solo si el pedido no
 * cabe en el empaque más grande, usando las mínimas cajas grandes posibles.
 */
function calcularPaquete(carrito) {
  let pesoContenido = 0;   // kg
  let volumenBruto  = 0;   // cm³

  for (const item of carrito) {
    const cant   = Math.max(1, Number(item.cantidad) || 1);
    const peso   = Number(item.pesoUnit)    > 0 ? Number(item.pesoUnit)    : PESO_UNIT_DEFECTO;
    const volumen = Number(item.volumenUnit) > 0 ? Number(item.volumenUnit) : VOLUMEN_UNIT_DEFECTO;
    pesoContenido += peso * cant;
    volumenBruto  += volumen * cant;
  }

  const volumenTotal = volumenBruto * HOLGURA_VOLUMEN;

  let paquetes;
  if (volumenTotal <= EMPAQUE_MAYOR.volumenMax) {
    // Cabe en un solo empaque: el más pequeño que lo aguante.
    const empaque = EMPAQUES.find((e) => volumenTotal <= e.volumenMax) || EMPAQUE_MAYOR;
    paquetes = [armarPaquete(empaque, pesoContenido)];
  } else {
    // No cabe: se reparte en varias cajas grandes (las mínimas), y el peso
    // del contenido se divide en partes iguales entre ellas.
    const n = Math.ceil(volumenTotal / EMPAQUE_MAYOR.volumenMax);
    paquetes = Array.from({ length: n }, () => armarPaquete(EMPAQUE_MAYOR, pesoContenido / n));
  }

  return {
    paquetes,
    pesoContenidoKg: redondearPeso(pesoContenido),
    volumenTotalCm3: Math.round(volumenTotal),
  };
}

/**
 * Pide a MiPaquete el costo de enviar estos paquetes al destino.
 * Devuelve { configurado, paquetes, cotizacion, aviso }.
 *
 * Si faltan credenciales (MIPAQUETE_API_KEY / dirección de origen), NO falla:
 * devuelve el paquete calculado y un aviso, para poder verificar el cálculo
 * aunque todavía no se pueda cobrar el envío real.
 */
async function cotizarEnvio({ carrito, destino }) {
  const { paquetes, pesoContenidoKg, volumenTotalCm3 } = calcularPaquete(carrito);
  const base = { paquetes, pesoContenidoKg, volumenTotalCm3 };

  if (!MIPAQUETE_API_KEY || !MIPAQUETE_SESSION_TRACKER || !ORIGEN_DANE) {
    return {
      ...base,
      configurado: false,
      cotizacion: null,
      opciones: [],
      aviso: 'MiPaquete no está configurado: faltan MIPAQUETE_API_KEY, MIPAQUETE_SESSION_TRACKER y/o TIENDA_DANE ' +
             'en el .env. Se devuelve el paquete calculado, pero no el costo real.',
    };
  }

  if (!destino?.codigoDane) {
    return { ...base, configurado: true, cotizacion: null, opciones: [], aviso: 'Falta el código DANE del municipio destino para cotizar.' };
  }

  // Todos los paquetes que calcula calcularPaquete son idénticos (el pedido va
  // en un solo empaque, o se reparte en varias cajas iguales), así que se pide
  // UNA cotización con quantity = nº de paquetes. MiPaquete exige enteros.
  const pkg = paquetes[0];
  try {
    const res = await fetch(`${MIPAQUETE_API_URL}/quoteShipping`, {
      method: 'POST',
      headers: {
        'apikey': MIPAQUETE_API_KEY,
        'session-tracker': MIPAQUETE_SESSION_TRACKER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originLocationCode:  ORIGEN_DANE,
        destinyLocationCode: destino.codigoDane,
        height: Math.ceil(pkg.altoCm),
        width:  Math.ceil(pkg.anchoCm),
        length: Math.ceil(pkg.largoCm),
        weight: Math.ceil(pkg.pesoFacturableKg),   // kg entero
        quantity: paquetes.length,
        declaredValue: destino.valorDeclarado || 0,
      }),
    });
    if (!res.ok) throw new Error(`MiPaquete respondió ${res.status}`);

    // La respuesta es un ARRAY de transportadoras. shippingCost = costo del envío.
    const data = await res.json();
    const opciones = (Array.isArray(data) ? data : [])
      .map((o) => ({
        transportadora: o.deliveryCompanyName,
        costo:          Number(o.shippingCost),
        diasEntrega:    o.shippingTime ? Math.round(o.shippingTime / 1440) : null, // min -> días
        logo:           o.deliveryCompanyImgUrl || null,
      }))
      .filter((o) => Number.isFinite(o.costo))
      .sort((a, b) => a.costo - b.costo);

    const masBarata = opciones[0] || null;
    return {
      ...base,
      configurado: true,
      opciones,
      cotizacion: masBarata ? { costoTotal: masBarata.costo, transportadora: masBarata.transportadora, moneda: 'COP' } : null,
      aviso: masBarata ? null : 'MiPaquete no devolvió transportadoras para esa ruta.',
    };
  } catch (e) {
    return { ...base, configurado: true, cotizacion: null, opciones: [], aviso: `No se pudo cotizar con MiPaquete: ${e.message}` };
  }
}

// Se llama cuando se aprueba un pago: pide la recolección del paquete.
// Sigue siendo un stub hasta tener credenciales; ahora usa calcularPaquete.
async function solicitarRecoleccion({ referencia, cliente, envio, carrito }) {
  const { paquetes } = calcularPaquete(carrito);
  console.log(`🚚 [MiPaquete] Recolección solicitada para pedido ${referencia}`);
  console.log(`   Destino: ${cliente?.nombre} — ${envio?.direccion}, ${envio?.ciudad}`);
  console.log(`   Paquetes: ${paquetes.length}`, paquetes);
  // TODO: llamada real a MiPaquete /shipments cuando haya MIPAQUETE_API_KEY.
}

module.exports = { calcularPaquete, cotizarEnvio, solicitarRecoleccion };
