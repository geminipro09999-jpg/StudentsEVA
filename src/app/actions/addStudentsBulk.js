"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function addStudentsBulk(studentsArray) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only administrators can add bulk students.");
        }

        if (!Array.isArray(studentsArray) || studentsArray.length === 0) {
            throw new Error("Payload is empty or invalid. Please check your Excel layout.");
        }

        // Map specific Excel keys safely to our Postgres Student keys
        const payload = studentsArray.map(s => ({
            student_id: s.Student_ID || s['Student ID'] || s.student_id,
            name: s.Name || s.name,
            course: s.Course || s.course,
            batch: String(s.Batch || s.batch || new Date().getFullYear()),
            photo_url: s.Photo_URL || s.photo_url || ""
        }));

        if (payload.some(p => !p.student_id || !p.name || !p.course)) {
            throw new Error("Some rows are missing required fields (Student_ID, Name, Course).");
        }

        const { error } = await supabase.from('students').insert(payload);

        if (error) {
            return { error: error.message };
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
