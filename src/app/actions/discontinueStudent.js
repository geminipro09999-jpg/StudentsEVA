"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function discontinueStudent(studentId, reason) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only administrators can discontinue students.");
        }
        if (!reason || !reason.trim()) {
            return { error: "A reason is required to discontinue a student." };
        }

        const { error } = await supabase
            .from('students')
            .update({
                status: 'discontinued',
                discontinue_reason: reason.trim(),
                discontinued_at: new Date().toISOString(),
            })
            .eq('id', studentId);

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        revalidatePath(`/students/${studentId}`);
        revalidatePath("/students/discontinued");
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
}

export async function reactivateStudent(studentId) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only administrators can reactivate students.");
        }

        const { error } = await supabase
            .from('students')
            .update({
                status: 'active',
                discontinue_reason: null,
                discontinued_at: null,
            })
            .eq('id', studentId);

        if (error) return { error: error.message };

        revalidatePath("/dashboard");
        revalidatePath(`/students/${studentId}`);
        revalidatePath("/students/discontinued");
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
}
