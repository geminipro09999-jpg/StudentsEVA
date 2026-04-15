"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getLabActivities() {
    const { data, error } = await supabase
        .from('lab_activities')
        .select('*')
        .order('name', { ascending: true });

    if (error) return [];
    return data;
}

export async function addLabActivity(name) {
    if (!name) return { error: "Name is required" };

    const { data, error } = await supabase
        .from('lab_activities')
        .insert({ name })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath("/feedback/add");
    return { success: true, data };
}
