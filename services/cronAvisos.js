// ============================================================
//  services/cronAvisos.js
//
//  Revisa cada tanto si hay avisos de reingreso que ya corresponda
//  mandar, y los manda.
//
//  Es la RED DE SEGURIDAD, no el camino principal. Lo normal será que
//  la pantalla de administración dispare el envío al marcar algo como
//  disponible, y entonces el correo sale en el acto. Esto cubre el otro
//  caso: que alguien edite la fila directo en el panel de Supabase, donde
//  no corre código nuestro y nadie se enteraría.
//
//  ── APAGADO POR DEFECTO ──
//  Solo arranca si AVISOS_CRON_MINUTOS está en el .env con un número
//  mayor que cero:
//
//      AVISOS_CRON_MINUTOS=15
//
//  Sin esa variable no hace absolutamente nada. La idea es que en la
//  máquina de desarrollo no se pongan a salir correos solos.
//
//  ── POR QUÉ setInterval Y NO node-cron ──
//  node-cron sirve para horarios de calendario ("los lunes a las 9").
//  Acá el intervalo es fijo, que es literalmente lo que setInterval
//  expresa. Una dependencia menos.
// ============================================================
const { enviarPendientes } = require('./avisos')

// Evita que dos pasadas se solapen. Si una tanda de correos se demora
// más que el intervalo, la siguiente se salta en vez de mandar todo
// dos veces: enviarPendientes() marca las filas solo AL FINAL, así que
// dos pasadas simultáneas verían los mismos pendientes.
let corriendo = false

async function pasada() {
  if (corriendo) {
    console.warn('[avisos] La pasada anterior sigue corriendo; se salta esta.')
    return
  }
  corriendo = true
  try {
    const r = await enviarPendientes()
    // Si no había nada, se calla: con una pasada cada 15 minutos, escribir
    // siempre llenaría el log de líneas que no dicen nada.
    if (r.revisados > 0) {
      console.log(`[avisos] Pasada automática: ${r.enviados} enviados de ${r.revisados} pendientes (${r.fallidos} fallos)`)
    }
  } catch (e) {
    // Un fallo acá NO puede tumbar el servidor: es una tarea de fondo.
    // Queda en el log y la próxima pasada lo vuelve a intentar.
    console.error('[avisos] Falló la pasada automática:', e.message)
  } finally {
    corriendo = false
  }
}

/**
 * Arranca la revisión periódica. Devuelve el temporizador, o null si
 * está apagada.
 */
function iniciarCronAvisos() {
  const minutos = Number(process.env.AVISOS_CRON_MINUTOS) || 0
  if (minutos <= 0) return null

  // A propósito NO se hace una pasada al arrancar. Si el servidor se
  // reinicia en bucle por otro motivo, no conviene que cada reinicio
  // dispare correos.
  const temporizador = setInterval(pasada, minutos * 60 * 1000)
  console.log(`[avisos] Revisión automática cada ${minutos} min.`)
  return temporizador
}

module.exports = { iniciarCronAvisos }
