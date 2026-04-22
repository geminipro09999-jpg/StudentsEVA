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
    const { data: attendance } = await supabase.from('attendance').select('*') || { data: [] };
    const googleSheetId = await getSetting('google_sheet_id');

    const activeCount = (students || []).filter(s => (s.status || 'active') === 'active').length;
    const discontinuedCount = (students || []).filter(s => s.status === 'discontinued').length;

    // Attendance Calculations
    const totalAttendance = (attendance || []).reduce((acc, curr) => acc + (curr.present_days / curr.total_days), 0);
    const avgAttendance = attendance?.length ? ((totalAttendance / attendance.length) * 100).toFixed(1) : '0.0';

    // Identify At-Risk Students (< 75% attendance)
    const atRiskStudents = (students || []).filter(s => {
        const studentAttendance = (attendance || []).filter(a => a.student_id === s.id);
        if (!studentAttendance.length) return false;
        const studentAvg = studentAttendance.reduce((acc, curr) => acc + (curr.present_days / curr.total_days), 0) / studentAttendance.length;
        return (studentAvg * 100) < 75;
    });

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

                <div className="stat-card animate-fade-in-scale stagger-3" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <label>Avg Attendance</label>
                            <h3 className="text-4xl font-bold" style={{ color: 'var(--accent-color)' }}>{avgAttendance}%</h3>
                            <p className="text-xs text-secondary mt-2">{atRiskStudents.length} At-Risk Students</p>
                        </div>
                        <div className="text-4xl opacity-50">📅</div>
                    </div>
                </div>

                {session.user.role === 'admin' ? (
                    <div className="stat-card warning animate-fade-in-scale stagger-4">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <label>Admin Control</label>
                                <p className="text-secondary text-sm">System oversight</p>
                            </div>
                            <div className="text-4xl opacity-50">⚡</div>
                        </div>
                        <div className="flex gap-3 wrap">
                            <Link href="/users" className="btn btn-secondary px-4 py-2" style={{ fontSize: '0.8rem' }}>
                                👥 Users
                            </Link>
                            <Link href="/labs-setup" className="btn btn-secondary px-4 py-2" style={{ fontSize: '0.8rem' }}>
                                🧪 Labs
                            </Link>
                            <Link href="/timesheet/invoice" className="btn btn-secondary px-4 py-2" style={{ fontSize: '0.8rem' }}>
                                🧾 Invoices
                            </Link>
                            <a href="/api/export" className="btn btn-primary px-4 py-2" style={{ fontSize: '0.8rem' }}>
                                📊 Export
                            </a>
                        </div>
                        <div className="mt-4 pt-4 border-t border-card-border">
                            <GoogleSheetSettings initialSheetId={googleSheetId} />
                        </div>
                    </div>
                ) : (
                    <div className="stat-card success animate-fade-in-scale stagger-4">
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

            {atRiskStudents.length > 0 && (
                <div className="card mb-8 animate-fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">⚠️</span>
                        <h3 className="text-xl font-bold m-0" style={{ color: 'var(--danger)' }}>Attendance Alerts</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {atRiskStudents.slice(0, 4).map(s => (
                            <div key={s.id} className="glass-card p-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                                    {(s.name || 'S').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm m-0">{s.name}</p>
                                    <p className="text-xs text-secondary m-0">Critical Attendance</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <DashboardCharts feedbacks={feedbacks || []} />

            <StudentDirectory students={studentsWithRating} user={session.user} />
        </div>
    );
}
