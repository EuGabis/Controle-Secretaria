const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const { data, error } = await supabase.rpc('get_triggers', { table_name: 'checklist_itens' })
  if (error) {
    // try direct query if rpc doesn't exist
    const { data: d2, error: e2 } = await supabase.from('pg_trigger').select('*').limit(1)
    if (e2) {
       console.log("Searching for trigger info via direct SQL...");
       const { data: d3, error: e3 } = await supabase.rpc('query_sql', { sql: "SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'checklist_itens'" })
       if (e3) {
         console.log("Could not query triggers directly. Assuming trigger exists based on behavior.");
       } else {
         console.log(JSON.stringify(d3, null, 2));
       }
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run()
