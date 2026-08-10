// ============================================================
//  scripts/probar-correo.js
//
//  Comprueba que el envío de correo esté bien configurado.
//
//    node scripts/probar-correo.js            -> solo muestra el mensaje
//    node scripts/probar-correo.js --enviar   -> lo manda de verdad
//
//  Sin --enviar no toca la red: sirve para revisar cómo se ve el correo.
//  Con --enviar prueba usuario y contraseña contra Zoho y manda una
//  solicitud de ejemplo a CORREO_DESTINO.
// ============================================================
require('dotenv').config()

const { armarCorreo } = require('../routes/asesoria')
const { enviarCorreo, verificarConexion, configurado } = require('../services/correo')

const EJEMPLO = {
  nombre: 'Ana Pérez',
  wa: '300 123 4567',
  prenda: 'chaqueta de paño',
  logro: 'dar estructura al cuello y a las solapas',
  tela: 'paño grueso',
  comentarios: 'Es para un abrigo de invierno, quiero que el cuello quede parado.',
}

async function main() {
  const enviar = process.argv.includes('--enviar')
  const { texto, html } = armarCorreo(EJEMPLO, 'ninguna')

  console.log('── Asunto ──')
  console.log(`Asesoría: ${EJEMPLO.nombre} — ${EJEMPLO.prenda}`)
  console.log('\n── Cuerpo (texto plano) ──')
  console.log(texto)
  console.log(`\n── HTML ──\n(${html.length} caracteres)`)

  console.log('\n── Configuración ──')
  console.log('SMTP_HOST      :', process.env.SMTP_HOST || '(vacío)')
  console.log('SMTP_PORT      :', process.env.SMTP_PORT || '(vacío)')
  console.log('SMTP_USER      :', process.env.SMTP_USER || '(vacío)')
  console.log('SMTP_PASS      :', process.env.SMTP_PASS ? '(definida)' : '(VACÍA)')
  console.log('CORREO_DESTINO :', process.env.CORREO_DESTINO || '(usa SMTP_USER)')

  if (!enviar) {
    console.log('\nPara enviarlo de verdad:  node scripts/probar-correo.js --enviar')
    return
  }

  if (!configurado()) {
    console.error('\nFaltan datos de SMTP en el .env. No se puede enviar.')
    process.exit(1)
  }

  console.log('\nProbando la conexión con el servidor...')
  await verificarConexion()
  console.log('Conexión y credenciales OK.')

  const id = await enviarCorreo({
    asunto: `[PRUEBA] Asesoría: ${EJEMPLO.nombre} — ${EJEMPLO.prenda}`,
    texto, html,
  })
  console.log('Correo enviado. messageId:', id)
  console.log('Revisá la bandeja de', process.env.CORREO_DESTINO || process.env.SMTP_USER)
}

main().catch((e) => {
  console.error('\nFalló:', e.message)
  if (/auth/i.test(e.message)) {
    console.error('Suele ser la contraseña: Zoho exige una CONTRASEÑA DE APLICACIÓN,')
    console.error('no la de la cuenta. Se genera en Mi cuenta -> Seguridad.')
  }
  process.exit(1)
})
