"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function addStudent(formData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only administrators can add students.");
        }

        const { error } = await supabase.from('students').insert({
            student_id: formData.get("student_id"),
            name: formData.get("name"),
            course: formData.get("course"),
            batch: formData.get("batch"),
            photo_url: formData.get("photo_url") || ""
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
