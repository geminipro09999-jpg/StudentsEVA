"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function addUser(formData) {
    try {
        const session = await getServerSession(authOptions);
        const roles = formData.getAll("roles");
        if (roles.length === 0) roles.push("lecturer"); // Default

        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!isAdmin) {
            throw new Error("Unauthorized: Only administrators can create users.");
        }

        const email = formData.get("email").toLowerCase();

        // Check if user exists
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existingUser) {
            throw new Error("A user with this email already exists.");
        }

        const hashedPassword = await bcrypt.hash(formData.get("password"), 10);

        const insertData = {
            name: formData.get("name"),
            email: email,
            password: hashedPassword,
            role: roles[0], // For legacy support
            roles: roles     // New multi-role support
        };

        const { error } = await supabase.from('users').insert(insertData);

        if (error) {
            // Fallback: If 'roles' column doesn't exist, try inserting without it
            if (error.code === '42703' || error.message.includes('roles')) {
                const { error: fallbackError } = await supabase.from('users').insert({
                    name: formData.get("name"),
                    email: email,
                    password: hashedPassword,
                    role: roles[0]
                });
                if (fallbackError) return { error: fallbackError.message };
            } else {
                return { error: error.message };
            }
        }

        revalidatePath("/users");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
