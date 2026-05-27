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
  if (error) throw new Error(error_message)
}


async function getTokenFromDB () {
  const { data, error } = await supabase
    .from('ml_tokens')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) throw new Error('No hay tokens guardados')
  return data
}



module.exports = {guardar, upsert, getTokenFromDB}