import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import ReportDirectory from "@/components/ReportDirectory";

export default async function ReportsPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect("/dashboard");
    }

    const { data: feedbacks, error } = await supabase
        .from('feedbacks')
        .select('*, students:student_id(name, student_id, group_name), lab_activities:lab_activity_id(name, subject_name), users:lecturer_id(name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching report data", error);
    }

    const ratingLabels = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Bad" };

    const reportData = (feedbacks || []).map(f => ({
        id: f.id,
        date: new Date(f.created_at).toLocaleDateString(),
        ut_number: f.students?.student_id || 'N/A',
        student_name: f.students?.name || 'N/A',
        group_name: f.students?.group_name || 'N/A',
        lab_activity: f.lab_activities?.name || 'Manual/Other',
        subject: f.lab_activities?.subject_name || 'General',
        category: f.category,
        rating: ratingLabels[f.rating] || f.rating,
        remark: f.remark,
        lecturer: f.users?.name || 'N/A'
    }));

    return (
        <div className="container animate-fade-in mt-8">
            <h2 className="text-3xl font-bold mb-6">Feedback Reports</h2>
            <ReportDirectory feedbacks={reportData} />
        </div>
    );
}
