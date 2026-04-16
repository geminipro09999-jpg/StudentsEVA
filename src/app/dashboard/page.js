import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import StudentDirectory from "@/components/StudentDirectory";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getSetting } from "@/app/actions/settingsActions";
import GoogleSheetSettings from "@/components/GoogleSheetSettings";

export default async function Dashboard() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const { data: students } = await supabase.from('students').select('*') || { data: [] };
    const { data: feedbacks } = await supabase.from('feedbacks').select('*') || { data: [] };
    const googleSheetId = await getSetting('google_sheet_id');

    const studentsWithRating = (students || []).map(student => {
        const studentFeedbacks = (feedbacks || []).filter(f => f.student_id === student.id);
        const avgRating = studentFeedbacks.length
            ? (studentFeedbacks.reduce((acc, f) => acc + f.rating, 0) / studentFeedbacks.length).toFixed(1)
            : 'N/A';
        // Provide _id to child components
        return { ...student, _id: student.id, avgRating, feedbackCount: studentFeedbacks.length };
    });

    return (
        <div className="container animate-fade-in mt-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold">Dashboard</h2>
                <p className="text-secondary mt-2">Welcome back, <span className="font-semibold text-primary">{session.user.name}</span></p>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="card">
                    <h3 className="text-4xl font-bold text-accent mb-2">{students?.length || 0}</h3>
                    <p className="font-medium text-secondary">Total Students</p>
                </div>
                <div className="card">
                    <h3 className="text-4xl font-bold text-success mb-2">{feedbacks?.length || 0}</h3>
                    <p className="font-medium text-secondary">Total Feedback Entries</p>
                </div>
                {session.user.role === 'admin' ? (
                    <div className="card">
                        <div className="flex justify-between items-start mb-4 wrap gap-2">
                            <div>
                                <h3 className="text-2xl font-bold text-warning">Admin Mode</h3>
                                <p className="font-medium text-secondary mt-1">Full access to system.</p>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/users" className="btn btn-secondary px-3 py-1 text-sm font-semibold">
                                    👥 Manage Users
                                </Link>
                                <a href="/api/export" className="btn btn-primary px-3 py-1 text-sm font-semibold">
                                    📊 Export Report
                                </a>
                            </div>
                        </div>
                        <GoogleSheetSettings initialSheetId={googleSheetId} />
                    </div>
                ) : (
                    <div className="card">
                        <h3 className="text-2xl font-bold text-success">Lecturer Mode</h3>
                        <p className="font-medium text-secondary mt-2">Provide feedback to students.</p>
                    </div>
                )}
            </div>

            <StudentDirectory students={studentsWithRating} user={session.user} />
        </div>
    );
}
