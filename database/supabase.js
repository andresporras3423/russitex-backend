const { createClient } = require('@supabase/supabase-js') // 👈 falta esto

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)
function guardar(table, data){
  supabase.from(table).insert(data).then(() => {}).catch(console.error)
}

async function upsert(table, data, error_message="un error ocurrió durante el upsert") {
  const { error } = await supabase.from(table).upsert(data)
  if (error){
    console.log(error);
    throw new Error(error_message)
  }
}


async function getTokensFromDB () {
  const { data, error } = await supabase
    .from('ml_tokens')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.log(error);
    throw new Error('No hay tokens guardados');
  }
  return data
}

async function select(table, filters = {}) {
  let query = supabase.from(table).select('*')
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  const { data, error } = await query.single()
  if (error) throw new Error(`Error leyendo ${table}`)
  return data
}

// Igual que select(), pero devuelve TODAS las filas que coincidan
// en vez de exigir exactamente una.
async function selectAll(table, filters = {}) {
  let query = supabase.from(table).select('*')
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  const { data, error } = await query
  if (error) {
    console.log(error)
    throw new Error(`Error leyendo ${table}: ${error.message}`)
  }
  return data || []
}


module.exports = {guardar, upsert, getTokensFromDB, select, selectAll}