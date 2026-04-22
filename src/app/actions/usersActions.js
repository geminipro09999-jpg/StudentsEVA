"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function getUsers() {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';

        if (!session || !isAdmin) {
            throw new Error("Unauthorized");
        }

        // Try to select both role and roles. If roles column doesn't exist yet, fallback to just role.
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, roles, created_at')
            .order('name');

        if (error) {
            // Fallback for if the roles column is not in the DB yet
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('users')
                .select('id, name, email, role, created_at')
                .order('name');

            if (fallbackError) throw fallbackError;
            return { data: fallbackData };
        }

        return { data };
    } catch (error) {
        console.error("getUsers error:", error);
        return { error: error.message };
    }
}

export async function changeUserPassword(formData) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';

        if (!session || !isAdmin) {
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

export async function updateUserRoles(userId, roles) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';

        if (!session || !isAdmin) {
            throw new Error("Unauthorized");
        }

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            throw new Error("At least one role is required.");
        }

        // Prepare update data. We update both for compatibility.
        const updateData = {
            roles: roles,
            role: roles[0]
        };

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            // If roles column doesn't exist, try just updating 'role'
            const { error: fallbackError } = await supabase
                .from('users')
                .update({ role: roles[0] })
                .eq('id', userId);

            if (fallbackError) throw fallbackError;
        }

        revalidatePath("/users");
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
