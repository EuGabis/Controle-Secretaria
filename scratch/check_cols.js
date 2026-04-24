const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  console.log("Checking checklist_turmas...")
  const { data: tData, error: tErr } = await supabase.from('checklist_turmas').select('*').limit(1)
  if (tErr) console.error("Error t:", tErr)
  else console.log("Columns in checklist_turmas:", Object.keys(tData[0] || {}))

  console.log("\nChecking checklist_itens...")
  const { data: iData, error: iErr } = await supabase.from('checklist_itens').select('*').limit(1)
  if (iErr) console.error("Error i:", iErr)
  else console.log("Columns in checklist_itens:", Object.keys(iData[0] || {}))

  console.log("\nChecking checklist_respostas...")
  const { data: rData, error: rErr } = await supabase.from('checklist_respostas').select('*').limit(1)
  if (rErr) console.error("Error r:", rErr)
  else console.log("Columns in checklist_respostas:", Object.keys(rData[0] || {}))
}

run()
