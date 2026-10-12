// ============================================================
//  scripts/whatsapp-plantillas.js  —  Crea las plantillas en Meta
//
//  Uso:  node scripts/whatsapp-plantillas.js          (crea las que falten)
//        node scripts/whatsapp-plantillas.js estado   (solo muestra su estado)
//
//  Necesita WHATSAPP_TOKEN y WHATSAPP_WABA_ID en el .env. Meta revisa cada
//  plantilla (de minutos a un día); hasta que estén APPROVED no se pueden
//  enviar. Si Meta rechaza una, el motivo sale en "estado".
// ============================================================
require('dotenv').config({ quiet: true })
const { PLANTILLAS, graph } = require('../services/whatsapp')

const token = process.env.WHATSAPP_TOKEN
const waba = process.env.WHATSAPP_WABA_ID

async function existentes() {
  const r = await fetch(graph(`${waba}/message_templates?fields=name,status,category,rejected_reason&limit=100`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`)
  return d.data || []
}

async function main() {
  if (!token || !waba) throw new Error('Faltan WHATSAPP_TOKEN o WHATSAPP_WABA_ID en el .env')
  const ya = await existentes()

  if (process.argv[2] === 'estado') {
    for (const nombre of Object.keys(PLANTILLAS)) {
      const t = ya.find((x) => x.name === nombre)
      console.log(`${nombre}: ${t ? `${t.status} (${t.category})${t.rejected_reason && t.rejected_reason !== 'NONE' ? ' — ' + t.rejected_reason : ''}` : 'no creada'}`)
    }
    return
  }

  for (const [nombre, p] of Object.entries(PLANTILLAS)) {
    if (ya.some((x) => x.name === nombre)) {
      console.log(`= ${nombre}: ya existe`)
      continue
    }
    const r = await fetch(graph(`${waba}/message_templates`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nombre,
        language: 'es',
        category: p.categoria,
        components: [{ type: 'BODY', text: p.texto, example: { body_text: [p.ejemplo] } }],
      }),
    })
    const d = await r.json()
    console.log(r.ok ? `+ ${nombre}: enviada a revisión (${d.status})` : `✗ ${nombre}: ${d?.error?.error_user_msg || d?.error?.message}`)
  }
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
