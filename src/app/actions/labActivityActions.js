"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getLabActivities() {
    const { data, error } = await supabase
        .from('lab_activities')
        .select('*, subjects(name)')
        .order('name', { ascending: true });

    if (error) return [];
    return data;
}

export async function addSubject(name) {
    if (!name) return { error: "Subject Name is required" };
    const { data, error } = await supabase.from('subjects').insert({ name }).select().single();
    if (error) return { error: error.message };
    revalidatePath("/labs-setup");
    revalidatePath("/feedback/add");
    return { success: true, data };
}

export async function deleteSubject(id) {
    // Check if any lab activity under this subject is used in feedbacks
    const { data: activities, error: actError } = await supabase
        .from('lab_activities')
        .select('id')
        .eq('subject_id', id);

    if (actError) return { error: actError.message };

    if (activities && activities.length > 0) {
        const activityIds = activities.map(a => a.id);
        const { count, error: countError } = await supabase
            .from('feedbacks')
            .select('*', { count: 'exact', head: true })
            .in('lab_activity_id', activityIds);

        if (countError) return { error: countError.message };
        if (count > 0) return { error: 'Cannot delete: One or more lab activities in this subject have existing feedback reports. Data is already taken.' };
    }

    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath("/labs-setup");
    revalidatePath("/feedback/add");
    return { success: true };
}

export async function addLabActivity(name, subject_id) {
    if (!name || !subject_id) return { error: "Name and subject are required" };

    const { data, error } = await supabase
        .from('lab_activities')
        .insert({ name, subject_id })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath("/labs-setup");
    revalidatePath("/feedback/add");
    return { success: true, data };
}

export async function deleteLabActivity(id) {
    const { count, error: countError } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('lab_activity_id', id);

    if (countError) return { error: countError.message };
    if (count > 0) return { error: 'Cannot delete: This lab activity has existing feedback reports. Data is already taken.' };

    const { error } = await supabase.from('lab_activities').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath("/labs-setup");
    revalidatePath("/feedback/add");
    return { success: true };
}
