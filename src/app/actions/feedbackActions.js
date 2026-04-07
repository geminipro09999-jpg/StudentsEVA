"use server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function addFeedback(formData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'lecturer') {
            throw new Error("Unauthorized: Only lecturers can add feedback.");
        }

        const { error } = await supabase.from('feedbacks').insert({
            student_id: formData.get("student_id"),
            lecturer_id: session.user.id,
            category: formData.get("category"),
            remark: formData.get("remark"),
            rating: Number(formData.get("rating"))
        });

        if (error) {
            return { error: error.message };
        }

        revalidatePath("/dashboard");
        revalidatePath(`/students/${formData.get("student_id")}`);
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
