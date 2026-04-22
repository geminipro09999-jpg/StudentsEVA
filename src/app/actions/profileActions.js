"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function updateProfile(userId, data) {
    if (!userId) return { error: "User ID is required" };

    const { error } = await supabase
        .from('users')
        .update({
            address: data.address,
            phone: data.phone,
            account_name: data.account_name,
            bank_name: data.bank_name,
            account_no: data.account_no,
            branch: data.branch
        })
        .eq('id', userId);

    if (error) return { error: error.message };

    revalidatePath("/profile");
    return { success: true };
}

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) return { error: error.message };
    return { data };
}
