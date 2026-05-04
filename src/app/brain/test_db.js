import { supabase } from "../../../src/lib/supabase";

async function testWeightColumn() {
    try {
        const { data, error } = await supabase
            .from('viva_panelists')
            .select('weight')
            .limit(1);
        
        if (error) {
            console.log("Column 'weight' does not exist or error:", error.message);
        } else {
            console.log("Column 'weight' exists!");
        }
    } catch (e) {
        console.error(e);
    }
}

testWeightColumn();
