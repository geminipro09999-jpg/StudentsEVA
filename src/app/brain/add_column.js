import { supabase } from "../../../src/lib/supabase";

async function addWeightColumn() {
    try {
        // Try to add column via RPC if it exists
        const { error } = await supabase.rpc('exec_sql', { 
            query: 'ALTER TABLE viva_panelists ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 100;' 
        });
        
        if (error) {
            console.log("RPC exec_sql failed:", error.message);
        } else {
            console.log("Column added successfully via RPC!");
            return;
        }

        // Try direct update with unknown column (sometimes works with some configurations)
        const { error: updateError } = await supabase
            .from('viva_panelists')
            .update({ weight: 100 })
            .limit(1);
        
        if (updateError) {
            console.log("Direct update failed:", updateError.message);
        } else {
            console.log("Column exists or was added!");
        }
    } catch (e) {
        console.error(e);
    }
}
