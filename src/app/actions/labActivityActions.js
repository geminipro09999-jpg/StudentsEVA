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
    const { error } = await supabase.from('lab_activities').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath("/labs-setup");
    revalidatePath("/feedback/add");
    return { success: true };
}
