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

    // 1. Fetch Feedback Data
    const { data: feedbacks } = await supabase
        .from('feedbacks')
        .select('*, students(name, student_id, group_name)')
        .order('created_at', { ascending: false });

    // 2. Fetch Viva Events
    const { data: vivas } = await supabase
        .from('viva_events')
        .select('*')
        .order('viva_date', { ascending: false });

    // 3. Fetch Quiz Marks
    const { data: quizzes } = await supabase
        .from('quiz_marks')
        .select('*, students(name, student_id, group_name)')
        .order('created_at', { ascending: false });

    // 4. Auxiliary Data for Mapping
    let allLabs = [];
    let allUsers = [];
    let allSubjects = [];

    const labsRes = await supabase.from('lab_activities').select('id, name, subject_id, subjects(name)');
    if (labsRes.data) allLabs = labsRes.data;

    const subjectsRes = await supabase.from('subjects').select('id, name');
    if (subjectsRes.data) allSubjects = subjectsRes.data;

    const usersRes = await supabase.from('users').select('id, name');
    if (usersRes.data) allUsers = usersRes.data;

    const labsMap = allLabs.reduce((acc, l) => { acc[l.id] = l; return acc; }, {});
    const usersMap = allUsers.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

    const ratingLabels = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Bad" };

    const formattedFeedbacks = (feedbacks || []).map(f => ({
        id: f.id,
        date: new Date(f.created_at).toLocaleDateString(),
        ut_number: f.students?.student_id || 'N/A',
        student_name: f.students?.name || 'N/A',
        group_name: f.students?.group_name || 'N/A',
        lab_activity: labsMap[f.lab_activity_id]?.name || 'Manual/Other',
        subject: labsMap[f.lab_activity_id]?.subjects?.name || 'General',
        category: f.category,
        rating: ratingLabels[f.rating] || f.rating,
        remark: f.remark,
        lecturer: usersMap[f.lecturer_id]?.name || 'N/A'
    }));

    return (
        <div className="container animate-fade-in mt-4">
            <div className="page-hero">
                <h2>📊 Centralized Reports</h2>
                <p>Analyze and export Feedbacks, Vivas, and Quiz data</p>
            </div>
            <ReportDirectory 
                feedbacks={formattedFeedbacks} 
                vivas={vivas || []}
                quizzes={quizzes || []}
                allSubjects={allSubjects} 
                allLabs={allLabs} 
            />
        </div>
    );
}
