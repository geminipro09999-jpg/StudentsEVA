import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import StudentDirectory from "@/components/StudentDirectory";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCharts from "@/components/DashboardCharts";

import { getSetting } from "@/app/actions/settingsActions";
import GoogleSheetSettings from "@/components/GoogleSheetSettings";

export default async function Dashboard() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const { data: students } = await supabase.from('students').select('*') || { data: [] };
    const { data: feedbacks } = await supabase.from('feedbacks').select('*') || { data: [] };
    const { data: labActivities } = await supabase.from('lab_activities').select('*') || { data: [] };
    const googleSheetId = await getSetting('google_sheet_id');

    const activeCount = (students || []).filter(s => (s.status || 'active') === 'active').length;
    const discontinuedCount = (students || []).filter(s => s.status === 'discontinued').length;

    const studentsWithRating = (students || []).map(student => {
        const studentFeedbacks = (feedbacks || []).filter(f => f.student_id === student.id);
        const avgRating = studentFeedbacks.length
            ? (studentFeedbacks.reduce((acc, f) => acc + f.rating, 0) / studentFeedbacks.length).toFixed(1)
            : 'N/A';
        return { ...student, _id: student.id, avgRating, feedbackCount: studentFeedbacks.length };
    });

    return (
        <div className="container animate-fade-in mt-4">
            {/* Hero Header */}
            <div className="page-hero">
                <h2>Dashboard</h2>
                <p>Welcome back, <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{session.user.name}</span> — here's your overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="stat-card accent animate-fade-in-scale stagger-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Active Students</p>
                            <h3 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent-color)', lineHeight: 1 }}>{activeCount}</h3>
                            <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.3rem' }}>{discontinuedCount} Discontinued</p>
                        </div>
                        <div style={{ fontSize: '2.2rem', opacity: 0.6 }}>🎓</div>
                    </div>
                </div>

                <div className="stat-card success animate-fade-in-scale stagger-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Feedback Entries</p>
                            <h3 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--success)', lineHeight: 1 }}>{feedbacks?.length || 0}</h3>
                        </div>
                        <div style={{ fontSize: '2.2rem', opacity: 0.6 }}>📝</div>
                    </div>
                </div>

                {session.user.role === 'admin' ? (
                    <div className="stat-card warning animate-fade-in-scale stagger-3">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Admin Panel</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Full system access</p>
                            </div>
                            <div style={{ fontSize: '2.2rem', opacity: 0.6 }}>⚡</div>
                        </div>
                        <div className="flex gap-2 wrap">
                            <Link href="/users" className="btn btn-secondary px-3 py-1 text-sm font-semibold" style={{ fontSize: '0.78rem' }}>
                                👥 Users
                            </Link>
                            <a href="/api/export" className="btn btn-primary px-3 py-1 text-sm font-semibold" style={{ fontSize: '0.78rem' }}>
                                📊 Export
                            </a>
                            <Link href="/students/discontinued" className="btn btn-secondary px-3 py-1 text-sm font-semibold" style={{ fontSize: '0.78rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                🔴 Discontinued ({discontinuedCount})
                            </Link>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            <GoogleSheetSettings initialSheetId={googleSheetId} />
                        </div>
                    </div>
                ) : (
                    <div className="stat-card success animate-fade-in-scale stagger-3">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Lecturer Mode</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Provide feedback to students</p>
                            </div>
                            <div style={{ fontSize: '2.2rem', opacity: 0.6 }}>📋</div>
                        </div>
                    </div>
                )}
            </div>

            <DashboardCharts feedbacks={feedbacks || []} />

            <StudentDirectory students={studentsWithRating} user={session.user} />
        </div>
    );
}
