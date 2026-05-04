const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const vivaId = '43328e58-663f-4391-8121-f3eafafbfd0b';

async function checkVivaData() {
    console.log('\n--- VIVA PANELISTS ---');
    const { data: panelists } = await supabase
        .from('viva_panelists')
        .select('*, users(name)')
        .eq('viva_id', vivaId);
    console.log(JSON.stringify(panelists, null, 2));

    console.log('\n--- VIVA CRITERIA ---');
    const { data: criteria } = await supabase
        .from('viva_criteria')
        .select('*')
        .eq('viva_id', vivaId);
    console.log(JSON.stringify(criteria, null, 2));

    console.log('\n--- VIVA SCORES ---');
    const { data: scores } = await supabase
        .from('viva_scores')
        .select('*, students(name), users(name), viva_criteria(name)')
        .eq('viva_id', vivaId);
    console.log(JSON.stringify(scores, null, 2));
}

checkVivaData();
