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
    // 1. Get a valid user_id
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (!users || users.length === 0) {
        console.log("No valid users found!");
        return;
    }
    const targetUserId = users[0].id;
    console.log("Using User ID:", targetUserId);

    // 2. Insert test invoice
    console.log("Testing Insert...");
    const { data, error } = await supabase.from('invoices').insert({
        user_id: targetUserId,
        invoice_no: 'TEST-5555',
        month: 'May',
        year: 2026,
        amount: 5000,
        invoice_data: { test: "This is a backend test invoice" },
        status: 'pending'
    }).select();

    console.log("Insert Response:", JSON.stringify(data, null, 2));
    console.log("Insert Error:", error ? error.message : "Success");
})();
