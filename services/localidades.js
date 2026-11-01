// ------------------------------------------------------------
// Localidades de Bogotá y barrio de la entrega.
//
// En Bogotá el segundo selector del checkout no es la ciudad (hay una
// sola) sino la localidad. El barrio es texto libre en todo el país.
// La misma lista está en el frontend: src/lib/localidades.js
// ------------------------------------------------------------
const LOCALIDADES = [
  'Antonio Nariño', 'Barrios Unidos', 'Bosa', 'Chapinero', 'Ciudad Bolívar',
  'Engativá', 'Fontibón', 'Kennedy', 'La Candelaria', 'Los Mártires',
  'Puente Aranda', 'Rafael Uribe Uribe', 'San Cristóbal', 'Santa Fe', 'Suba',
  'Sumapaz', 'Teusaquillo', 'Tunjuelito', 'Usaquén', 'Usme',
]

const esBogota = (dane) => String(dane || '').startsWith('11001')

const limpio = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// { localidad, barrio } válidos para ese municipio (null si no aplica).
function ubicacion(dane, { localidad, barrio } = {}) {
  return {
    localidad: esBogota(dane) && LOCALIDADES.includes(localidad) ? localidad : null,
    barrio: limpio(barrio, 80) || null,
  }
}

// "Calle 66 # 21-50, barrio Galerías, localidad Teusaquillo" (para correos y avisos).
function direccionCompleta(envio = {}) {
  return [
    envio.direccion,
    envio.barrio && `barrio ${envio.barrio}`,
    envio.localidad && `localidad ${envio.localidad}`,
  ].filter(Boolean).join(', ')
}

module.exports = { LOCALIDADES, esBogota, ubicacion, direccionCompleta, limpio }
