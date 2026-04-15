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
        <div className="container animate-fade-in mt-4">
            <div style={{ marginBottom: '2rem' }}>
                <h2>Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {session.user.name}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card">
                    <h3 style={{ fontSize: '2rem', color: 'var(--accent-color)' }}>{students?.length || 0}</h3>
                    <p style={{ fontWeight: '500' }}>Total Students</p>
                </div>
                <div className="glass-card">
                    <h3 style={{ fontSize: '2rem', color: 'var(--success)' }}>{feedbacks?.length || 0}</h3>
                    <p style={{ fontWeight: '500' }}>Total Feedback Entries</p>
                </div>
                {session.user.role === 'admin' ? (
                    <div className="glass-card">
                        <div className="d-flex justify-between items-center mb-3">
                            <div>
                                <h3 style={{ fontSize: '1.5rem', color: 'var(--warning)', marginTop: '0.4rem' }}>Admin Mode</h3>
                                <p style={{ fontWeight: '500', marginTop: '0.5rem' }}>Full access to system.</p>
                            </div>
                            <div className="d-flex gap-1">
                                <Link href="/users" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                    👥 Manage Users
                                </Link>
                                <a href="/api/export" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                    📊 Export Report
                                </a>
                            </div>
                        </div>
                        <GoogleSheetSettings initialSheetId={googleSheetId} />
                    </div>
                ) : (
                    <div className="glass-card">
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--success)', marginTop: '0.4rem' }}>Lecturer Mode</h3>
                        <p style={{ fontWeight: '500', marginTop: '0.5rem' }}>Provide feedback to students.</p>
                    </div>
                )}
            </div>

            <StudentDirectory students={studentsWithRating} user={session.user} />
        </div>
    );
}
