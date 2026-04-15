"use server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { syncFeedbackToGoogleSheet } from "@/lib/googleSheets";
import { getSetting } from "./settingsActions";

export async function addFeedback(formData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'lecturer') {
            throw new Error("Unauthorized: Only lecturers can add feedback.");
        }

        const student_id = formData.get("student_id");
        const lab_activity_id = formData.get("lab_activity_id");
        const rating = Number(formData.get("rating"));
        const remark = formData.get("remark");
        const category = formData.get("category");

        const { error } = await supabase.from('feedbacks').insert({
            student_id,
            lecturer_id: session.user.id,
            category,
            remark,
            rating,
            lab_activity_id: lab_activity_id || null
        });

        if (error) {
            return { error: error.message };
        }

        // --- Google Sheets Sync (Optional / Failure should not block DB operation) ---
        try {
            const sheetId = await getSetting('google_sheet_id');
            if (sheetId) {
                // Fetch extra info for sheet (names)
                const { data: student } = await supabase.from('students').select('name, student_id').eq('id', student_id).single();
                const { data: lab } = lab_activity_id ? await supabase.from('lab_activities').select('name').eq('id', lab_activity_id).single() : { data: null };

                const ratingLabels = { 4: "Excellent", 3: "Good", 2: "Poor", 1: "Bad" };

                await syncFeedbackToGoogleSheet(sheetId, {
                    student_id: student?.student_id || 'N/A',
                    student_name: student?.name || 'N/A',
                    lab_name: lab?.name || 'Manual/Other',
                    category,
                    rating_label: ratingLabels[rating] || rating,
                    remark,
                    lecturer_name: session.user.name
                });
            }
        } catch (syncErr) {
            console.error("Sync to Sheets failed:", syncErr);
        }

        revalidatePath("/dashboard");
        revalidatePath(`/students/${student_id}`);
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

export async function syncAllFeedback() {
    try {
        console.log("Starting full sync...");
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            throw new Error("Unauthorized: Only admins can perform a full sync.");
        }

        const sheetId = await getSetting('google_sheet_id');
        if (!sheetId) {
            throw new Error("Google Sheet ID not configured in settings.");
        }

        // Fetch all feedbacks with related data
        // Explicitly name the relationships if needed
        const { data: feedbacks, error } = await supabase
            .from('feedbacks')
            .select(`
                id,
                created_at,
                category,
                rating,
                remark,
                students:student_id (name, student_id),
                lab_activities:lab_activity_id (name),
                users:lecturer_id (name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return { error: error.message };
        }

        console.log(`Fetched ${feedbacks?.length} entries. Syncing to sheet...`);

        const { syncBulkFeedbackToGoogleSheet } = await import("@/lib/googleSheets");
        const res = await syncBulkFeedbackToGoogleSheet(sheetId, feedbacks);

        if (res.error) {
            console.error("Bulk sync error:", res.error);
            return { error: res.error };
        }

        console.log("Sync complete!");
        return { success: true, count: res.count };
    } catch (error) {
        console.error("Global syncAllFeedback error:", error);
        return { error: error.message };
    }
}


