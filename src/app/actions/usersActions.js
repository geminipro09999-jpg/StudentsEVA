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

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, roles, created_at, hourly_rate, payment_unit')
            .order('name');

        if (error) {
            // Fallback for if the columns are not in the DB yet
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('users')
                .select('id, name, email, role, roles, created_at')
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
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const userId = formData.get('userId');
        const newPassword = formData.get('newPassword');
        if (!userId || !newPassword) throw new Error("Missing required fields");

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', userId);

        if (error) throw error;

        revalidatePath("/users");
        return { success: true };
    } catch (error) {
        console.error("changeUserPassword error:", error);
        return { error: error.message };
    }
}

export async function updateUserRoles(userId, roles, paymentInfo = {}) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';

        if (!session || !isAdmin) {
            throw new Error("Unauthorized");
        }

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            throw new Error("At least one role is required.");
        }

        const updateData = {
            roles: roles,
            role: roles[0],
            hourly_rate: paymentInfo.hourly_rate,
            payment_unit: paymentInfo.payment_unit
        };

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            // Fallback for if roles column doesn't exist
            const fallbackData = {
                role: roles[0],
                hourly_rate: paymentInfo.hourly_rate,
                payment_unit: paymentInfo.payment_unit
            };
            const { error: fallbackError } = await supabase
                .from('users')
                .update(fallbackData)
                .eq('id', userId);

            if (fallbackError) {
                // If even the second one fails, try just roles (most likely case if just rate is missing)
                await supabase.from('users').update({ role: roles[0], roles: roles }).eq('id', userId);
                throw fallbackError;
            }
        }

        revalidatePath("/users");
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

export async function updateUserName(userId, newName) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        if (!userId || !newName?.trim()) throw new Error("User ID and name are required.");

        const { error } = await supabase
            .from('users')
            .update({ name: newName.trim() })
            .eq('id', userId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error("updateUserName error:", error);
        return { error: error.message };
    }
}
