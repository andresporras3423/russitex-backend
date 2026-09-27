// ============================================================
//  services/envios.js  —  Integración con Envia.com + cálculo del paquete
//
//  Tres responsabilidades:
//    1. calcularPaquete(carrito): a partir del peso y volumen de cada
//       producto, decide en qué bolsa/caja estándar va el pedido y con
//       qué dimensiones y peso hay que cotizar.
//    2. cotizarEnvio: pide tarifas a todas las transportadoras de Envia y
//       se queda con la más barata.
//    3. crearEnvio: genera la guía cuando se aprueba el pago.
//
//  Ambientes (Envia tiene uno de pruebas y uno de producción, con cuentas
//  y llaves distintas):
//    - Las COTIZACIONES van siempre a producción (ENVIA_API_KEY): cotizar
//      no cuesta y así el checkout muestra precios reales.
//    - Las GUÍAS van al ambiente que diga ENVIA_ENVIOS_AMBIENTE
//      ("pruebas" por defecto, con ENVIA_TEST_API_KEY; o "produccion"), y
//      solo se crean si ENVIA_CREAR_ENVIOS=true.
//
//  La transportadora cobra por el MAYOR entre el peso real y el peso
//  volumétrico = (largo × ancho × alto) / 2500.
// ============================================================
const { municipios } = require('../data/municipios-co.json');
const { obtenerCatalogo } = require('./catalogo');

const ENVIA = {
  produccion: {
    api:      'https://api.envia.com',
    consultas: 'https://queries.envia.com',
    llave:    (process.env.ENVIA_API_KEY || '').trim(),
  },
  pruebas: {
    api:      'https://api-test.envia.com',
    consultas: 'https://queries.test.envia.com',
    llave:    (process.env.ENVIA_TEST_API_KEY || '').trim(),
  },
};
const AMBIENTE_ENVIOS = process.env.ENVIA_ENVIOS_AMBIENTE === 'produccion' ? 'produccion' : 'pruebas';
const CREAR_ENVIOS = process.env.ENVIA_CREAR_ENVIOS === 'true';

// Transportadoras activas en Colombia según Envia (2026-09-27). Se usan si
// no se puede consultar la lista en vivo.
const TRANSPORTADORAS_DEFECTO = [
  'cabify', 'coordinadora', 'dhl', 'envia', 'fedex', 'interRapidisimo', 'lastMile',
  'mensajerosUrbanos', 'noventa9Minutos', 'serviEntrega', 'tcc', 'welivery',
];

// Código DANE del municipio de origen (desde donde se despacha). Bogotá = 11001000.
const ORIGEN_DANE = process.env.TIENDA_DANE || '11001000';

// Datos del remitente. Para cotizar solo importa la ciudad; para una guía
// REAL (producción) hacen falta los datos verdaderos del almacén.
const REMITENTE = {
  nombre:    process.env.TIENDA_NOMBRE,
  telefono:  process.env.TIENDA_TELEFONO,
  direccion: process.env.TIENDA_DIRECCION,
  email:     process.env.TIENDA_EMAIL,
  nit:       process.env.TIENDA_NIT,
};
const REMITENTE_COMPLETO = Object.values(REMITENTE).every(Boolean);

// DANE -> { ciudad, departamento, codigoDepartamento } (Envia pide el código
// de departamento de 2 letras además del DANE).
const MUNICIPIO_POR_DANE = new Map(municipios.map((m) => [m.dane, m]));

// Factor de peso volumétrico que usan las transportadoras en Colombia.
// (algunas usan 5000; aquí se toma 2500). Se deja como constante para ajustarlo.
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

// ------------------------------------------------------------
// Envia: helpers de bajo nivel
// ------------------------------------------------------------
async function llamarEnvia(ambiente, ruta, cuerpo, { timeoutMs = 10000 } = {}) {
  const { api, llave } = ENVIA[ambiente];
  const res = await fetch(`${api}${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const datos = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, datos };
}

// Lista de transportadoras de Colombia, cacheada un día.
let _transportadoras = { lista: null, hasta: 0 };
async function transportadorasColombia(ambiente) {
  if (ambiente === 'produccion' && _transportadoras.lista && Date.now() < _transportadoras.hasta) {
    return _transportadoras.lista;
  }
  try {
    const { consultas, llave } = ENVIA[ambiente];
    const res = await fetch(`${consultas}/carrier?country_code=CO`, {
      headers: { Authorization: `Bearer ${llave}` },
      signal: AbortSignal.timeout(8000),
    });
    const lista = (await res.json()).data?.filter((c) => c.active !== false).map((c) => c.name);
    if (!lista?.length) throw new Error('lista vacía');
    if (ambiente === 'produccion') _transportadoras = { lista, hasta: Date.now() + 24 * 3600 * 1000 };
    return lista;
  } catch (e) {
    console.warn(`[envios] No se pudo traer la lista de transportadoras (${e.message}); uso la de respaldo.`);
    return TRANSPORTADORAS_DEFECTO;
  }
}

// Dirección en el formato de Envia para Colombia: city y postalCode llevan el
// DANE de 8 dígitos y state el código de departamento de 2 letras.
function direccionEnvia(dane, datos) {
  const m = MUNICIPIO_POR_DANE.get(dane);
  if (!m) return null;
  return {
    name:    datos.nombre || 'Russitex',
    company: datos.empresa || '',
    email:   datos.email || '',
    phone:   datos.telefono || '3000000000',
    phone_code: 'CO',
    street:  datos.direccion || 'Sin dirección',
    number:  '',
    district: '',
    reference: datos.referencia || '',
    identificationNumber: datos.documento || '',
    city:    dane,
    postalCode: dane,
    state:   m.codigoDepartamento,
    country: 'CO',
  };
}

// Los paquetes que calcula calcularPaquete son idénticos (uno solo, o varias
// cajas grandes iguales), así que van como UNA línea con amount = cantidad.
function paquetesEnvia(paquetes, valorDeclarado) {
  const p = paquetes[0];
  return [{
    type: 'box',
    content: 'Insumos de confección',
    amount: paquetes.length,
    name: p.empaque,
    declaredValue: Math.round(valorDeclarado || 0),
    lengthUnit: 'CM',
    weightUnit: 'KG',
    // Peso REAL; la transportadora aplica su propio volumétrico con las medidas.
    weight: p.pesoRealKg,
    dimensions: { length: p.largoCm, width: p.anchoCm, height: p.altoCm },
  }];
}

// Pide tarifas a todas las transportadoras en paralelo. Devuelve las opciones
// ordenadas de la más barata a la más cara.
async function tarifas(ambiente, { origen, destino, paquetes, transportadoras }) {
  const lista = transportadoras || await transportadorasColombia(ambiente);
  const respuestas = await Promise.all(lista.map(async (carrier) => {
    try {
      const { datos } = await llamarEnvia(ambiente, '/ship/rate/', {
        origin: origen, destination: destino, packages: paquetes,
        shipment: { type: 1, carrier }, settings: { currency: 'COP' },
      }, { timeoutMs: 6000 });   // el cliente está esperando en el checkout
      return Array.isArray(datos.data) ? datos.data : [];
    } catch {
      return [];   // una transportadora lenta o caída no tumba la cotización
    }
  }));
  return respuestas.flat()
    .map((t) => ({
      carrier:        t.carrier,
      servicio:       t.service,
      transportadora: t.carrierDescription || t.carrier,
      descripcion:    t.serviceDescription || '',
      costo:          Number(t.totalPrice),
      entrega:        t.deliveryEstimate || null,
    }))
    .filter((t) => Number.isFinite(t.costo) && t.costo > 0)
    .sort((a, b) => a.costo - b.costo);
}

// ------------------------------------------------------------
// Cotizar
// ------------------------------------------------------------

/**
 * Completa cada línea del carrito con el peso y el volumen del catálogo.
 * No se toman del cliente, para que nadie pueda falsear el envío.
 * Devuelve { lineas, desconocidos } (desconocidos = ids que no están en el catálogo).
 */
async function resolverCarrito(carrito) {
  const { productos } = await obtenerCatalogo();
  const porId = new Map(productos.map((p) => [String(p.id), p]));
  const lineas = carrito.map((item) => {
    const p = porId.get(String(item.productoId));
    return {
      productoId:  item.productoId,
      cantidad:    Math.max(1, Number(item.cantidad) || 1),
      pesoUnit:    p?.pesoUnit ?? null,
      volumenUnit: p?.volumenUnit ?? null,
      encontrado:  Boolean(p),
    };
  });
  return { lineas, desconocidos: lineas.filter((l) => !l.encontrado).map((l) => l.productoId) };
}

// Las cotizaciones se guardan 10 minutos: el checkout y /api/pagos/preparar
// piden la misma y así no se repiten ~12 llamadas ni cambia el precio entre
// que el cliente lo ve y paga.
const _cotizaciones = new Map();
const VIGENCIA_COTIZACION_MS = 10 * 60 * 1000;

/**
 * Cotiza el envío de un carrito con Envia (producción) y elige la opción
 * más barata. Devuelve { configurado, paquetes, cotizacion, opciones, aviso }.
 *
 * Si falta la llave, NO falla: devuelve el paquete calculado y un aviso.
 */
async function cotizarEnvio({ carrito, destino }) {
  const { paquetes, pesoContenidoKg, volumenTotalCm3 } = calcularPaquete(carrito);
  const base = { paquetes, pesoContenidoKg, volumenTotalCm3 };

  if (!ENVIA.produccion.llave) {
    return { ...base, configurado: false, cotizacion: null, opciones: [],
      aviso: 'Envia no está configurado: falta ENVIA_API_KEY.' };
  }
  const origen  = direccionEnvia(ORIGEN_DANE, REMITENTE);
  const destinoEnvia = direccionEnvia(destino?.codigoDane, {});
  if (!destinoEnvia) {
    return { ...base, configurado: true, cotizacion: null, opciones: [],
      aviso: 'Falta el código DANE del municipio destino (o no es válido) para cotizar.' };
  }

  const paquetesE = paquetesEnvia(paquetes, destino.valorDeclarado);
  const clave = JSON.stringify([destino.codigoDane, paquetesE]);
  const guardada = _cotizaciones.get(clave);
  if (guardada && Date.now() - guardada.en < VIGENCIA_COTIZACION_MS) return { ...base, ...guardada.resultado };

  const opciones = await tarifas('produccion', { origen, destino: destinoEnvia, paquetes: paquetesE });
  const masBarata = opciones[0] || null;
  const resultado = {
    configurado: true,
    opciones,
    cotizacion: masBarata && {
      costoTotal:     Math.round(masBarata.costo),
      transportadora: masBarata.transportadora,
      carrier:        masBarata.carrier,
      servicio:       masBarata.servicio,
      entrega:        masBarata.entrega,
      moneda:         'COP',
    },
    aviso: masBarata ? null : 'No hay transportadoras con cobertura para esa ciudad.',
  };
  if (masBarata) _cotizaciones.set(clave, { en: Date.now(), resultado });
  return { ...base, ...resultado };
}

// Lista de municipios de Colombia con su código DANE para el checkout.
// Sale de data/municipios-co.json (no depende de ningún proveedor).
async function obtenerCiudades() {
  return {
    configurado: true,
    ciudades: municipios.map(({ dane, ciudad, departamento }) => ({ dane, ciudad, departamento })),
  };
}

// ------------------------------------------------------------
// Crear la guía (al aprobarse el pago)
// ------------------------------------------------------------

/**
 * Genera la guía del pedido en Envia. Devuelve los datos de la guía, o null
 * si la creación está apagada (ENVIA_CREAR_ENVIOS) o el pedido no lleva envío.
 *
 * En "pruebas" usa la misma transportadora que se cotizó en producción, pero
 * el servicio puede llamarse distinto en ese ambiente: si falla, vuelve a
 * cotizar en pruebas y usa el servicio más barato de esa transportadora (o
 * el más barato de todas si esa no está en pruebas).
 */
async function crearEnvio({ referencia, cliente, envio, carrito }) {
  if (!CREAR_ENVIOS) {
    console.log(`🚚 [Envia] Creación de guías apagada (ENVIA_CREAR_ENVIOS). Pedido ${referencia} sin guía.`);
    return null;
  }
  if (!envio?.codigoDane) {
    console.log(`🚚 [Envia] Pedido ${referencia} sin destino (recoge en tienda): no se crea guía.`);
    return null;
  }
  const ambiente = AMBIENTE_ENVIOS;
  if (!ENVIA[ambiente].llave) throw new Error(`Falta la llave de Envia del ambiente "${ambiente}".`);
  if (ambiente === 'produccion' && !REMITENTE_COMPLETO) {
    throw new Error('Faltan datos del remitente (TIENDA_NOMBRE, TIENDA_TELEFONO, TIENDA_DIRECCION, TIENDA_EMAIL, TIENDA_NIT) para crear guías reales.');
  }

  const { paquetes } = calcularPaquete(carrito);
  const valorDeclarado = (carrito || []).reduce((s, i) => s + (Number(i.precio) || 0) * (Number(i.cantidad) || 1), 0);
  const cuerpo = {
    origin: direccionEnvia(ORIGEN_DANE, { ...REMITENTE, empresa: 'Russitex', documento: REMITENTE.nit }),
    destination: direccionEnvia(envio.codigoDane, {
      nombre: cliente?.nombre, email: cliente?.email, telefono: cliente?.telefono,
      direccion: envio.direccion, documento: cliente?.documento,
    }),
    packages: paquetesEnvia(paquetes, valorDeclarado),
    settings: { currency: 'COP', printFormat: 'PDF', printSize: 'STOCK_4X6' },
  };
  const generar = (carrier, service) => llamarEnvia(ambiente, '/ship/generate/', {
    ...cuerpo,
    shipment: { type: 1, carrier, service, reverse_pickup: 0, import: 0, orderReference: referencia },
  }, { timeoutMs: 30000 });

  // Envia responde algunos errores con HTTP 200 y el detalle en `error`: solo
  // cuenta como éxito si volvió un número de guía.
  const guiaDe = (r) => (Array.isArray(r.datos?.data) && r.datos.data[0]?.trackingNumber ? r.datos.data[0] : null);

  let { carrier, servicio } = envio;
  let r = carrier && servicio ? await generar(carrier, servicio) : { ok: false };

  // Solo en pruebas: si falla, se prueban otras opciones de ese ambiente (la
  // misma transportadora primero). En producción no se cambia de
  // transportadora a escondidas: el error sube y Wompi reintenta.
  if (!guiaDe(r) && ambiente === 'pruebas') {
    const fallida = `${carrier}/${servicio}`;
    const opcionesPrueba = (await tarifas('pruebas', { origen: cuerpo.origin, destino: cuerpo.destination, paquetes: cuerpo.packages }))
      .filter((o) => `${o.carrier}/${o.servicio}` !== fallida)
      .sort((a, b) => (b.carrier === carrier) - (a.carrier === carrier));
    for (const alterna of opcionesPrueba.slice(0, 4)) {
      ({ carrier, servicio } = alterna);
      r = await generar(carrier, servicio);
      if (guiaDe(r)) break;
    }
  }

  const guia = guiaDe(r);
  if (!guia) {
    throw new Error(`Envia no generó la guía (${r.status || 'sin respuesta'}): ${JSON.stringify(r.datos?.error || r.datos).slice(0, 300)}`);
  }

  console.log(`🚚 [Envia/${ambiente}] Guía ${guia.trackingNumber} (${carrier} ${servicio}) para pedido ${referencia}`);
  return {
    ambiente,
    carrier,
    servicio,
    numeroGuia:  guia.trackingNumber,
    envioId:     guia.shipmentId,
    etiquetaUrl: guia.label,
    rastreoUrl:  guia.trackUrl,
    costo:       guia.totalPrice,
    creadaEn:    new Date().toISOString(),
  };
}

module.exports = { calcularPaquete, resolverCarrito, cotizarEnvio, obtenerCiudades, crearEnvio };
