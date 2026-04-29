"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function importQuizMarks(quizData, quizName, totalMarks = 100) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        if (!Array.isArray(quizData) || quizData.length === 0) {
            throw new Error("No data found in CSV.");
        }

        // 1. Get all student IDs and UT Numbers for matching
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id, student_id');
        
        if (studentError) throw studentError;

        const studentMap = new Map(students.map(s => [s.student_id, s.id]));

        const validMarks = [];
        const errors = [];

        quizData.forEach((row, index) => {
            const utNumber = String(row['UT Number'] || row['Student ID'] || row.student_id || row['UT_Number'] || '').trim();
            const marks = parseFloat(row.Marks || row.marks || row.Score || row.score);

            if (!utNumber) {
                errors.push({ row: index + 1, error: "UT Number is missing" });
                return;
            }

            if (isNaN(marks)) {
                errors.push({ row: index + 1, utNumber, error: "Invalid marks" });
                return;
            }

            const internalId = studentMap.get(utNumber);
            if (!internalId) {
                errors.push({ row: index + 1, utNumber, error: "Student not found in database" });
                return;
            }

            validMarks.push({
                student_id: internalId,
                quiz_name: quizName,
                marks: marks,
                total_marks: totalMarks
            });
        });

        if (validMarks.length > 0) {
            const { error: insertError } = await supabase
                .from('quiz_marks')
                .insert(validMarks);
            
            if (insertError) throw insertError;
        }

        revalidatePath("/dashboard");
        revalidatePath("/reports");
        return { 
            success: true, 
            importedCount: validMarks.length, 
            errorCount: errors.length,
            errors: errors 
        };
    } catch (error) {
        console.error("importQuizMarks error:", error);
        return { error: error.message };
    }
}

export async function getQuizMarks(studentId) {
    try {
        const { data, error } = await supabase
            .from('quiz_marks')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { data };
    } catch (error) {
        return { error: error.message };
    }
}
