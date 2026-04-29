import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { notFound } from "next/navigation";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default async function StudentProfilePage({ params }) {
    const session = await getServerSession(authOptions);

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

    if (!student) {
        return notFound();
    }

    // Bypass PostgREST schema cache issues with manual joins
    const { data: rawFeedbacks } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false });

    // Fetch related docs manually
    const { data: allUsers } = await supabase.from('users').select('id, name');
    const { data: allLabs } = await supabase.from('lab_activities').select('id, name, subject_id');
    const { data: allSubjects } = await supabase.from('subjects').select('id, name');

    // Fetch attendance records for this student
    const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.student_id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    // Fetch quiz records for this student
    const { data: quizzes } = await supabase
        .from('quiz_marks')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false });

    const usersMap = (allUsers || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const subjectsMap = (allSubjects || []).reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
    const labsMap = (allLabs || []).reduce((acc, l) => {
        acc[l.id] = { ...l, subjectName: subjectsMap[l.subject_id]?.name };
        return acc;
    }, {});

    const feedbacks = (rawFeedbacks || []).map(f => ({
        ...f,
        users: { name: usersMap[f.lecturer_id]?.name || 'Unknown Lecturer' },
        lab_activities: {
            name: labsMap[f.lab_activity_id]?.name || 'Unknown Lab',
            subjectName: labsMap[f.lab_activity_id]?.subjectName
        }
    }));

    const validFeedbacks = feedbacks || [];
    const avgRating = validFeedbacks.length
        ? (validFeedbacks.reduce((acc, f) => acc + f.rating, 0) / validFeedbacks.length).toFixed(1)
        : 'N/A';

    const ratingMap = {
        5: { label: "Excellent", color: "#10b981", icon: "💎" },
        4: { label: "Very Good", color: "#0ea5e9", icon: "🌟" },
        3: { label: "Good", color: "#3b82f6", icon: "✨" },
        2: { label: "Average", color: "#f59e0b", icon: "⚠️" },
        1: { label: "Bad", color: "#ef4444", icon: "❌" }
    };

    // Overall attendance summary
    const attendance = attendanceRecords || [];
    const overallPresent = attendance.reduce((s, r) => s + r.present_days, 0);
    const overallTotal = attendance.reduce((s, r) => s + r.total_days, 0);
    const overallPct = overallTotal > 0 ? ((overallPresent / overallTotal) * 100).toFixed(1) : null;
    const overallColor = overallPct >= 75 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="container animate-fade-in mt-4">
            <Link href="/dashboard" className="btn btn-secondary mb-4" style={{ fontSize: '0.9rem', display: 'inline-flex', padding: '0.4rem 1rem' }}>
                ← Back to Directory
            </Link>

            <div className="profile-grid">
                <div className="profile-sidebar">
                    <div className="glass-card text-center flex flex-col items-center">
                        {student.photo_url ? (
                            <img src={student.photo_url} alt="portrait" style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', border: '3px solid rgba(255,255,255,0.1)' }} />
                        ) : (
                            <div style={{ width: '150px', height: '150px', background: '#334155', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Photo</div>
                        )}
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>{student.name}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{student.student_id}</p>

                        <div className="flex w-full justify-between mt-2" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                            <span>Course:</span>
                            <span style={{ fontWeight: '500' }}>{student.course}</span>
                        </div>
                        <div className="flex w-full justify-between mt-1">
                            <span>Batch:</span>
                            <span style={{ fontWeight: '500' }}>{student.batch}</span>
                        </div>
                        <div className="flex w-full justify-between mt-1" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                            <span>Group:</span>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>{student.group_name || 'No Group'}</span>
                        </div>

                        {(session.user.role === 'lecturer' || session.user.role === 'admin') && (
                            <div className="w-full mt-6">
                                <Link
                                    href={`/feedback/add?studentId=${student.id}`}
                                    className="btn btn-primary w-full animate-pulse-glow"
                                    style={{ padding: '0.8rem' }}
                                >
                                    ✍️ Give Feedback
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="glass-card mt-4 text-center">
                        <h3 style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Rating</h3>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-color)', margin: '0.5rem 0' }}>
                            {avgRating !== 'N/A' ? `${avgRating}` : '-'}
                        </div>
                        {avgRating !== 'N/A' && (
                            <div className="stars justify-center">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={`star ${star <= Math.round(avgRating) ? 'filled' : ''}`}>★</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Overall Attendance Card */}
                    {overallPct !== null && (
                        <div className="glass-card mt-4 text-center">
                            <h3 style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Attendance</h3>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: overallColor, margin: '0.5rem 0' }}>
                                {overallPct}%
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {overallPresent} / {overallTotal} days
                            </div>
                            <div style={{ marginTop: '0.75rem', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(overallPct, 100)}%`, height: '100%', background: overallColor, borderRadius: '999px', transition: 'width 0.5s' }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="profile-main">
                    {/* Quiz Performance History */}
                    <div className="glass-card mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 style={{ fontSize: '1.5rem' }}>📝 Quiz Performance</h3>
                            <span className="badge" style={{ background: 'rgba(66, 133, 244, 0.1)', color: '#4285f4' }}>{(quizzes || []).length} Quizzes</span>
                        </div>

                        {(!quizzes || quizzes.length === 0) ? (
                            <p style={{ color: 'var(--text-secondary)' }}>No quiz marks recorded for this student yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {quizzes.map((q) => (
                                    <div key={q.id} className="p-4 rounded-xl bg-surface-container-low border border-card-border flex justify-between items-center">
                                        <div>
                                            <h6 className="text-sm font-bold m-0">{q.quiz_name}</h6>
                                            <p className="text-[10px] text-tertiary m-0">{new Date(q.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-accent-color m-0">{q.marks} / {q.total_marks}</p>
                                            <span className={`text-[10px] font-bold ${((q.marks/q.total_marks)*100) >= 50 ? 'text-success' : 'text-danger'}`}>
                                                {((q.marks / q.total_marks) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Attendance History */}
                    <div className="glass-card mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 style={{ fontSize: '1.5rem' }}>📋 Attendance History</h3>
                            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{attendance.length} Month{attendance.length !== 1 ? 's' : ''}</span>
                        </div>

                        {attendance.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>No attendance data uploaded for this student yet.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                            {['Month', 'Year', 'Present', 'Total', 'Attendance %', 'Status'].map(h => (
                                                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map((rec) => {
                                            const pct = rec.total_days > 0 ? ((rec.present_days / rec.total_days) * 100) : 0;
                                            const pctStr = pct.toFixed(1);
                                            const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                            const statusLabel = pct >= 75 ? '✅ Good' : pct >= 50 ? '⚠️ Average' : '❌ At Risk';
                                            return (
                                                <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: '500' }}>{MONTH_NAMES[rec.month]}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem' }}>{rec.year}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem' }}>{rec.present_days}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem' }}>{rec.total_days}</td>
                                                    <td style={{ padding: '0.65rem 0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px' }}>
                                                                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '999px' }} />
                                                            </div>
                                                            <span style={{ color, fontWeight: '600' }}>{pctStr}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.65rem 0.75rem' }}>
                                                        <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{statusLabel}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Feedback History */}
                    <div className="glass-card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 style={{ fontSize: '1.5rem' }}>Feedback History</h3>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent-color)' }}>{validFeedbacks.length} Records</span>
                        </div>

                        {validFeedbacks.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>No feedback recorded for this student yet.</p>
                        ) : session.user.role === 'admin' ? (
                            <div className="flex-col gap-2" style={{ gap: '1rem' }}>
                                {validFeedbacks.map(f => (
                                    <div key={f.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                                        <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                                            <div>
                                                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', marginRight: '0.5rem' }}>{f.category}</span>
                                                {f.lab_activities?.name && (
                                                    <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)', marginRight: '0.5rem' }}>
                                                        {f.lab_activities.subjectName ? `${f.lab_activities.subjectName}: ` : ''}{f.lab_activities.name}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>by {f.users?.name || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span style={{ fontSize: '1.2rem' }}>{ratingMap[f.rating]?.icon}</span>
                                                <span style={{ fontWeight: '600', color: ratingMap[f.rating]?.color }}>{ratingMap[f.rating]?.label}</span>
                                            </div>
                                        </div>
                                        <p style={{ lineHeight: '1.6' }}>"{f.remark}"</p>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                                            {new Date(f.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--card-border)' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>🔒 Only Administrators are authorized to view specific feedback remarks and history.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
