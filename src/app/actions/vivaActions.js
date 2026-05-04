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
                is_active: data.is_active !== false, // Default to true
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

        // 3. Assign Panelists with Weights
        if (panelists && panelists.length > 0) {
            const panelistsData = panelists.map(p => ({
                viva_id: viva.id,
                user_id: p.user_id,
                weight: p.weight || (100 / panelists.length)
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
        let query = supabase.from('viva_events').select('*, criteria:viva_criteria(*), panelists:viva_panelists(user_id, weight, users(id, name, email))').order('viva_date', { ascending: false });

        if (!isAdmin) {
            // Only get active vivas where user is a panelist
            const { data: assignments, error: assignError } = await supabase
                .from('viva_panelists')
                .select('viva_id')
                .eq('user_id', session.user.id);
            
            if (assignError) throw assignError;
            
            const vivaIds = assignments.map(a => a.viva_id);
            if (vivaIds.length === 0) return { data: [] };
            
            query = query.in('id', vivaIds).eq('is_active', true);
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
            .maybeSingle(); // Use maybeSingle to avoid throwing on 0 rows
            
        if (vivaError) throw vivaError;
        if (!viva) return { data: null, error: "Viva session not found." };

        // 2. Get Criteria
        const { data: criteria, error: criteriaError } = await supabase
            .from('viva_criteria')
            .select('*')
            .eq('viva_id', vivaId)
            .order('created_at');
        if (criteriaError) throw criteriaError;

        // 3. Get Panelists with Weights
        const { data: panelists, error: panelistsError } = await supabase
            .from('viva_panelists')
            .select('user_id, weight, users(id, name, email)')
            .eq('viva_id', vivaId);
        if (panelistsError) throw panelistsError;

        return { data: { ...viva, criteria, panelists } };
    } catch (error) {
        console.error("getVivaDetails error for ID:", vivaId);
        console.error("Message:", error.message);
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

export async function updateViva(vivaId, data) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const { name, date, criteria, panelists, is_active } = data;

        // 1. Update Viva Event
        const { error: vivaError } = await supabase
            .from('viva_events')
            .update({
                name,
                viva_date: date,
                deadline: `${date}T23:59:59Z`,
                is_active: is_active !== false
            })
            .eq('id', vivaId);

        if (vivaError) throw vivaError;

        // 2. Update Criteria
        if (criteria && criteria.length > 0) {
            // Get existing criteria to know what to delete
            const { data: existingCriteria } = await supabase
                .from('viva_criteria')
                .select('id')
                .eq('viva_id', vivaId);
            
            const newCriteriaIds = criteria.filter(c => c.id).map(c => c.id);
            const criteriaToDelete = existingCriteria?.filter(ec => !newCriteriaIds.includes(ec.id)).map(ec => ec.id) || [];
            
            if (criteriaToDelete.length > 0) {
                await supabase.from('viva_criteria').delete().in('id', criteriaToDelete);
            }

            // Upsert criteria
            for (const c of criteria) {
                const criteriaPayload = {
                    viva_id: vivaId,
                    name: c.name,
                    max_marks: c.max_marks,
                    is_required: c.is_required !== undefined ? c.is_required : true,
                    admin_only: c.admin_only || false
                };
                
                if (c.id) {
                    // Update
                    await supabase.from('viva_criteria').update(criteriaPayload).eq('id', c.id);
                } else {
                    // Insert
                    await supabase.from('viva_criteria').insert(criteriaPayload);
                }
            }
        }

        // 3. Update Panelists (Delete all existing for this viva and re-insert to handle weight changes cleanly)
        if (panelists && panelists.length > 0) {
            await supabase.from('viva_panelists').delete().eq('viva_id', vivaId);
            
            const panelistsData = panelists.map(p => ({
                viva_id: vivaId,
                user_id: p.user_id,
                weight: p.weight || (100 / panelists.length)
            }));
            const { error: panelistsError } = await supabase
                .from('viva_panelists')
                .insert(panelistsData);
                
            if (panelistsError) throw panelistsError;
        }

        revalidatePath("/vivas");
        revalidatePath(`/vivas/${vivaId}`);
        return { success: true };
    } catch (error) {
        console.error("updateViva error:", error);
        return { error: error.message };
    }
}
