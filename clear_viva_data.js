const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearVivaData() {
  console.log("⚠️ PREPARING TO CLEAR ALL VIVA DATA ⚠️");

  const tables = [
    'viva_scores',
    'viva_panelists',
    'viva_criteria',
    'viva_events',
    'quiz_marks'
  ];

  for (const table of tables) {
    console.log(`Clearing table: ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
      console.error(`Error clearing ${table}:`, error.message);
    } else {
      console.log(`✅ Table ${table} cleared.`);
    }
  }

  console.log("\n✨ ALL VIVA DATA HAS BEEN CLEARED FROM SUPABASE ✨");
}

clearVivaData();
