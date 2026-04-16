import { supabase } from "@/lib/supabase";
import AddFeedbackForm from "@/components/AddFeedbackForm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function AddFeedbackPage() {
    const session = await getServerSession(authOptions);
    if (!session || !['lecturer', 'admin'].includes(session.user.role)) {
        redirect("/dashboard");
    }

    const { data: students } = await supabase.from('students').select('*') || { data: [] };
    const { data: subjects } = await supabase.from('subjects').select('*').order('name') || { data: [] };
    const { data: labActivities } = await supabase.from('lab_activities').select('*, subjects(name)').order('name') || { data: [] };

    const serializedStudents = (students || []).map(s => ({
        ...s,
        _id: s.id // polyfill for AddFeedbackForm
    }));

    return (
        <div className="container animate-fade-in mt-4">
            <div className="text-center mb-4">
                <h2>Add Student Feedback</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Provide constructive feedback and a rating for a student.</p>
            </div>
            <AddFeedbackForm students={serializedStudents} initialSubjects={subjects || []} initialLabActivities={labActivities || []} userRole={session.user.role} />
        </div>
    );
}
