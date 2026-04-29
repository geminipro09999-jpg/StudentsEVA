"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function findStudentByUT(utNumber) {
    try {
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, student_id, name, photo_url, course, batch')
            .eq('student_id', utNumber)
            .maybeSingle();
        
        if (studentError) throw studentError;
        if (!student) return { data: null };

        // Also fetch previous feedbacks/ratings
        const { data: history, error: historyError } = await supabase
            .from('feedbacks')
            .select('*, users(name)')
            .eq('student_id', student.id)
            .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        // Fetch Quiz marks
        const { data: quizzes, error: quizError } = await supabase
            .from('quiz_marks')
            .select('*')
            .eq('student_id', student.id)
            .order('created_at', { ascending: false });

        if (quizError) throw quizError;

        return { data: { ...student, history, quizzes } };
    } catch (error) {
        console.error("findStudentByUT error:", error);
        return { error: error.message };
    }
}

export async function submitScores({ vivaId, studentId, scores, remark }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';

        // 1. Check if already verified
        const { data: existingScores } = await supabase
            .from('viva_scores')
            .select('is_verified, is_locked')
            .eq('viva_id', vivaId)
            .eq('student_id', studentId)
            .eq('lecturer_id', session.user.id);
        
        if (existingScores?.some(s => s.is_verified)) {
            throw new Error("Scores are verified by Admin and cannot be changed.");
        }

        // Prepare scores for upsert
        const scoresToInsert = Object.entries(scores).map(([criteriaId, score]) => ({
            viva_id: vivaId,
            student_id: studentId,
            lecturer_id: session.user.id,
            criteria_id: criteriaId,
            score: parseFloat(score),
            remark: remark || "",
            is_locked: true,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('viva_scores')
            .upsert(scoresToInsert, { 
                onConflict: 'viva_id, student_id, lecturer_id, criteria_id' 
            });

        if (error) throw error;

        revalidatePath(`/viva-scoring/${vivaId}`);
        return { success: true };
    } catch (error) {
        console.error("submitScores error:", error);
        return { error: error.message };
    }
}

export async function getStudentScores(vivaId, studentId) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';

        let query = supabase
            .from('viva_scores')
            .select('*, users(name), viva_criteria(name, max_marks)')
            .eq('viva_id', vivaId)
            .eq('student_id', studentId);

        if (!isAdmin) {
            // Staff only see their own scores
            query = query.eq('lecturer_id', session.user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { data };
    } catch (error) {
        console.error("getStudentScores error:", error);
        return { error: error.message };
    }
}

export async function getAllScoresForViva(vivaId) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const { data, error } = await supabase
            .from('viva_scores')
            .select('*, students(id, student_id, name, photo_url), users(name), viva_criteria(name, max_marks)')
            .eq('viva_id', vivaId)
            .order('created_at');
        
        if (error) throw error;

        return { data };
    } catch (error) {
        console.error("getAllScoresForViva error:", error);
        return { error: error.message };
    }
}

export async function verifyScores(vivaId, studentId, lecturerId) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const { error } = await supabase
            .from('viva_scores')
            .update({ is_verified: true })
            .eq('viva_id', vivaId)
            .eq('student_id', studentId)
            .eq('lecturer_id', lecturerId);

        if (error) throw error;

        revalidatePath(`/vivas/${vivaId}`);
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

export async function updateScoresByAdmin({ vivaId, studentId, lecturerId, scores, remark }) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) throw new Error("Unauthorized");

        const scoresToUpdate = Object.entries(scores).map(([criteriaId, score]) => ({
            viva_id: vivaId,
            student_id: studentId,
            lecturer_id: lecturerId,
            criteria_id: criteriaId,
            score: parseFloat(score),
            remark: remark || "",
            is_locked: true,
            is_verified: true, // Auto-verify if admin edits
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('viva_scores')
            .upsert(scoresToUpdate, { 
                onConflict: 'viva_id, student_id, lecturer_id, criteria_id' 
            });

        if (error) throw error;

        revalidatePath(`/vivas/${vivaId}`);
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}
