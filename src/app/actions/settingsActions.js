"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSetting(key) {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) return null;
    return data.value;
}

export async function updateSetting(key, value) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { success: true };
}
