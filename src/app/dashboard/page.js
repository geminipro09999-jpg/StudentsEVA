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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="stat-card accent animate-fade-in-scale stagger-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <label>Active Students</label>
                            <h3 className="text-4xl font-bold text-accent">{activeCount}</h3>
                            <p className="text-xs text-danger mt-2">{discontinuedCount} Discontinued</p>
                        </div>
                        <div className="text-4xl opacity-50">🎓</div>
                    </div>
                </div>

                <div className="stat-card success animate-fade-in-scale stagger-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <label>Feedback Entries</label>
                            <h3 className="text-4xl font-bold text-success">{feedbacks?.length || 0}</h3>
                        </div>
                        <div className="text-4xl opacity-50">📝</div>
                    </div>
                </div>

                {session.user.role === 'admin' ? (
                    <div className="stat-card warning animate-fade-in-scale stagger-3 lg:col-span-1 md:col-span-2">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <label>Admin Control</label>
                                <p className="text-secondary text-sm">System oversight</p>
                            </div>
                            <div className="text-4xl opacity-50">⚡</div>
                        </div>
                        <div className="flex gap-3 wrap">
                            <Link href="/users" className="btn btn-secondary px-4 py-2">
                                👥 Users
                            </Link>
                            <Link href="/labs-setup" className="btn btn-secondary px-4 py-2">
                                🧪 Labs
                            </Link>
                            <Link href="/timesheet/invoice" className="btn btn-secondary px-4 py-2">
                                🧾 Invoices
                            </Link>
                            <a href="/api/export" className="btn btn-primary px-4 py-2">
                                📊 Export
                            </a>
                            <Link href="/students/discontinued" className="btn btn-secondary px-4 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                🔴 Discontinued
                            </Link>
                        </div>
                        <div className="mt-6 pt-4 border-t border-card-border">
                            <GoogleSheetSettings initialSheetId={googleSheetId} />
                        </div>
                    </div>
                ) : (
                    <div className="stat-card success animate-fade-in-scale stagger-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <label>Lecturer Portal</label>
                                <p className="text-secondary text-sm mt-2">Active observation mode</p>
                            </div>
                            <div className="text-4xl opacity-50">📋</div>
                        </div>
                    </div>
                )}
            </div>

            <DashboardCharts feedbacks={feedbacks || []} />

            <StudentDirectory students={studentsWithRating} user={session.user} />
        </div>
    );
}
