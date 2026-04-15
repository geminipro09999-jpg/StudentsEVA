"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function getUsers() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized");
        }

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at')
            .order('name');

        if (error) throw error;
        return { data };
    } catch (error) {
        return { error: error.message };
    }
}

export async function changeUserPassword(formData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized");
        }

        const userId = formData.get("userId");
        const newPassword = formData.get("newPassword");

        if (!newPassword || newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', userId);

        if (error) throw error;

        revalidatePath("/users");
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
