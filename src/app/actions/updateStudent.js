"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function updateStudent(formData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only administrators can update students.");
        }

        const id = formData.get("id");
        const student_id = formData.get("student_id");
        const name = formData.get("name");
        const course = formData.get("course");
        const batch = formData.get("batch");
        const group_name = formData.get("group_name");
        const photo_url = formData.get("photo_url");

        const { error } = await supabase
            .from('students')
            .update({
                student_id,
                name,
                course,
                batch,
                group_name,
                photo_url
            })
            .eq('id', id);

        if (error) {
            return { error: error.message };
        }

        revalidatePath("/dashboard");
        revalidatePath(`/students/${id}`);
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
