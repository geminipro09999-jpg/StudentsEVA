import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return new Response("Unauthorized", { status: 401 });
        }

        const { data: feedbacks, error } = await supabase
            .from('feedbacks')
            .select('*, students(name, student_id, group_name), lab_activities(name), users(name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const ratingLabels = { 4: "Excellent", 3: "Good", 2: "Poor", 1: "Bad" };

        const exportData = feedbacks.map(f => ({
            'Date': new Date(f.created_at).toLocaleDateString(),
            'UT Number': f.students?.student_id || 'N/A',
            'Student Name': f.students?.name || 'N/A',
            'Group': f.students?.group_name || 'N/A',
            'Lab Activity': f.lab_activities?.name || 'Manual/Other',
            'Category': f.category,
            'Rating': ratingLabels[f.rating] || f.rating,
            'Remark': f.remark,
            'Lecturer': f.users?.name || 'N/A'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Feedbacks");

        const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new Response(buf, {
            status: 200,
            headers: {
                'Content-Disposition': 'attachment; filename="Feedback_Report.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}
