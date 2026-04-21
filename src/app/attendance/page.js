import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import AttendanceUpload from "@/components/AttendanceUpload";
import AttendanceReport from "@/components/AttendanceReport";

export default async function AttendancePage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect("/dashboard");
    }

    const { data: records } = await supabase
        .from('attendance')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    const { data: students } = await supabase
        .from('students')
        .select('id, student_id, name, group_name, course, batch')
        .order('name');

    return (
        <div className="container animate-fade-in mt-4">
            <div className="page-hero">
                <h2>📋 Attendance Management</h2>
                <p>Upload monthly attendance in bulk and view detailed reports</p>
            </div>

            {/* Upload Section */}
            <details open style={{ marginBottom: '1.5rem' }}>
                <summary style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1rem 1.5rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    color: 'var(--accent-color)',
                    backdropFilter: 'blur(16px)',
                }}>
                    <span style={{ fontSize: '1.2rem' }}>⬆️</span>
                    Upload Attendance (Bulk Excel / CSV)
                </summary>
                <div style={{ paddingTop: '1.5rem' }}>
                    <AttendanceUpload />
                </div>
            </details>

            {/* Report Section */}
            <details open style={{ marginBottom: '1.5rem' }}>
                <summary style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1rem 1.5rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    color: 'var(--success)',
                    backdropFilter: 'blur(16px)',
                }}>
                    <span style={{ fontSize: '1.2rem' }}>📊</span>
                    Attendance Reports
                </summary>
                <div style={{ paddingTop: '1.5rem' }}>
                    <AttendanceReport records={records || []} students={students || []} />
                </div>
            </details>
        </div>
    );
}
