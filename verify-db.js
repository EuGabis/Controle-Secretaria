const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  // Limpando admin_id orfão
  const { error: e1 } = await supabase.from('usuarios')
    .update({ admin_id: null })
    .eq('admin_id', '1f0db207-56f4-4f02-b6f2-094d1eb21890')
  if (e1) console.error("Erro e1:", e1)

  // Limpando master_id orfão
  const { error: e2 } = await supabase.from('usuarios')
    .update({ master_id: null })
    .eq('master_id', '1f0db207-56f4-4f02-b6f2-094d1eb21890')
  if (e2) console.error("Erro e2:", e2)

  console.log("Limpeza concluída com sucesso!")
}

run()
