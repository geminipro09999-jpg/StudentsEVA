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
        .select('*, students(name, student_id, group_name)')
        .order('created_at', { ascending: false });

    // Fallback lookups in case Foreign Keys are missing from the schema cache
    let allLabs = [];
    let allUsers = [];
    try {
        const labsRes = await supabase.from('lab_activities').select('id, name, subject_name');
        if (labsRes.data) allLabs = labsRes.data;
    } catch { }

    try {
        const usersRes = await supabase.from('users').select('id, name');
        if (usersRes.data) allUsers = usersRes.data;
    } catch { }

    const labsMap = allLabs.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});
    const usersMap = allUsers.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

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
        lab_activity: labsMap[f.lab_activity_id]?.name || 'Manual/Other',
        subject: labsMap[f.lab_activity_id]?.subject_name || 'General',
        category: f.category,
        rating: ratingLabels[f.rating] || f.rating,
        remark: f.remark,
        lecturer: usersMap[f.lecturer_id]?.name || 'N/A'
    }));

    return (
        <div className="container animate-fade-in mt-8">
            <h2 className="text-3xl font-bold mb-6">Feedback Reports</h2>
            <ReportDirectory feedbacks={reportData} />
        </div>
    );
}
