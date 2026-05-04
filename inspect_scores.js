const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkScores() {
  const { data: scores } = await supabase
    .from('viva_scores')
    .select('*, students(name), users(name), viva_criteria(name)');
  
  console.log(JSON.stringify(scores, null, 2));
}

checkScores();
