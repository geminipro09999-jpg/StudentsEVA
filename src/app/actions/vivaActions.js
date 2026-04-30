"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function createViva(data) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const { name, date, criteria, panelists } = data;

        // 1. Create Viva Event
        const { data: viva, error: vivaError } = await supabase
            .from('viva_events')
            .insert({
                name,
                viva_date: date,
                deadline: `${date}T23:59:59Z`, // Set deadline to end of the day
                created_by: session.user.id
            })
            .select()
            .single();

        if (vivaError) throw vivaError;

        if (criteria && criteria.length > 0) {
            const criteriaData = criteria.map(c => ({
                viva_id: viva.id,
                name: c.name,
                max_marks: c.max_marks,
                is_required: c.is_required !== undefined ? c.is_required : true,
                admin_only: c.admin_only || false
            }));
            const { error: criteriaError } = await supabase
                .from('viva_criteria')
                .insert(criteriaData);
            if (criteriaError) throw criteriaError;
        }

        // 3. Assign Panelists
        if (panelists && panelists.length > 0) {
            const panelistsData = panelists.map(p => ({
                viva_id: viva.id,
                user_id: p
            }));
            const { error: panelistsError } = await supabase
                .from('viva_panelists')
                .insert(panelistsData);
            if (panelistsError) throw panelistsError;
        }

        revalidatePath("/vivas");
        return { success: true, vivaId: viva.id };
    } catch (error) {
        console.error("createViva error:", error);
        return { error: error.message };
    }
}

export async function getVivas() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        
        let query = supabase.from('viva_events').select('*').order('viva_date', { ascending: false });

        if (!isAdmin) {
            // Only get vivas where user is a panelist
            const { data: assignments, error: assignError } = await supabase
                .from('viva_panelists')
                .select('viva_id')
                .eq('user_id', session.user.id);
            
            if (assignError) throw assignError;
            
            const vivaIds = assignments.map(a => a.viva_id);
            if (vivaIds.length === 0) return { data: [] };
            
            query = query.in('id', vivaIds);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { data };
    } catch (error) {
        console.error("getVivas error:", error);
        return { error: error.message };
    }
}

export async function getVivaDetails(vivaId) {
    try {
        console.log("getVivaDetails called with ID:", vivaId, "Type:", typeof vivaId);
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        // 1. Get Event Details
        const { data: viva, error: vivaError } = await supabase
            .from('viva_events')
            .select('*')
            .eq('id', vivaId)
            .single();
        if (vivaError) throw vivaError;

        // 2. Get Criteria
        const { data: criteria, error: criteriaError } = await supabase
            .from('viva_criteria')
            .select('*')
            .eq('viva_id', vivaId)
            .order('created_at');
        if (criteriaError) throw criteriaError;

        // 3. Get Panelists
        const { data: panelists, error: panelistsError } = await supabase
            .from('viva_panelists')
            .select('user_id, users(id, name, email)')
            .eq('viva_id', vivaId);
        if (panelistsError) throw panelistsError;

        return { data: { ...viva, criteria, panelists } };
    } catch (error) {
        console.error("getVivaDetails error for ID:", vivaId);
        console.error("Message:", error.message);
        console.error("Details:", error.details || "None");
        console.error("Stack:", error.stack);
        return { error: error.message || "An error occurred while fetching viva details" };
    }
}

export async function deleteViva(vivaId) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const { error } = await supabase
            .from('viva_events')
            .delete()
            .eq('id', vivaId);
        
        if (error) throw error;

        revalidatePath("/vivas");
        return { success: true };
    } catch (error) {
        console.error("deleteViva error:", error);
        return { error: error.message };
    }
}
