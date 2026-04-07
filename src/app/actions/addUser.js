"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function addUser(formData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only administrators can create users.");
        }

        const email = formData.get("email").toLowerCase();

        // Check if user exists
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existingUser) {
            throw new Error("A user with this email already exists.");
        }

        const hashedPassword = await bcrypt.hash(formData.get("password"), 10);

        const { error } = await supabase.from('users').insert({
            name: formData.get("name"),
            email: email,
            password: hashedPassword,
            role: formData.get("role")
        });

        if (error) {
            return { error: error.message };
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
