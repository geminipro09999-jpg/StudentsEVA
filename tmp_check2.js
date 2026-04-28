const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    if (line.includes('=')) {
        const [k, v] = line.split('=');
        acc[k.trim()] = v.trim().replace(/^"|"$/g, '');
    }
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.from('invoices').select('id, user_id, month, year, status').order('created_at', { ascending: false });
    console.log('Invoices in DB:', JSON.stringify(data, null, 2));
    if (error) console.error('Error fetching invoices:', error);
})();
