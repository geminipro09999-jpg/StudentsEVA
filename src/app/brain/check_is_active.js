require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Attempting to add 'is_active' column to 'viva_events'...");
  
  // Actually, Supabase JS client doesn't have DDL methods. We have to use rpc if there's one, or we can just run a direct REST call if we have service key.
  // Wait, the anon key might not have DDL access. Let's try to do it via a quick server-side route or edge function, or we can just ask the user to do it in the Supabase Dashboard.
  // OR, we can try to use a postgres function if we have one.
  // If we can't alter table via REST, we will use a workaround or tell the user.
  
  // Let me first test if the column exists by selecting it.
  const { data, error } = await supabase.from('viva_events').select('is_active').limit(1);
  if (error && error.code === 'PGRST204') {
    console.log("Column is_active does not exist.");
  } else {
    console.log("Column is_active already exists or error:", error || "Exists!");
  }
}
run();
