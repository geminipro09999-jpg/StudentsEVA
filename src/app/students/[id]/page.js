import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudentProfileLayout from "@/components/StudentProfileLayout";

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

    // Fetch Viva scores for this student
    const { data: vivaScores } = await supabase
        .from('viva_scores')
        .select('*, viva_events(name), viva_criteria(name, max_marks)')
        .eq('student_id', id)
        .order('created_at', { ascending: false });

    const usersMap = (allUsers || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const subjectsMap = (allSubjects || []).reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
    const labsMap = (allLabs || []).reduce((acc, l) => {
        acc[l.id] = { ...l, subjectName: subjectsMap[l.subject_id]?.name };
        return acc;
    }, {});

    const groupedVivas = (vivaScores || []).reduce((acc, score) => {
        const eventName = score.viva_events?.name || 'Unknown Viva';
        if (!acc[eventName]) {
            acc[eventName] = {
                name: eventName,
                date: score.created_at,
                total: 0,
                maxTotal: 0,
                metrics: []
            };
        }
        acc[eventName].metrics.push({
            name: score.viva_criteria?.name,
            score: score.score,
            max: score.viva_criteria?.max_marks
        });
        acc[eventName].total += score.score;
        acc[eventName].maxTotal += score.viva_criteria?.max_marks || 0;
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
                    <StudentProfileLayout 
                        student={student}
                        vivas={groupedVivas}
                        quizzes={quizzes || []}
                        attendance={attendance || []}
                        feedbacks={validFeedbacks}
                        ratingMap={ratingMap}
                        monthNames={MONTH_NAMES}
                        sessionRole={session.user.role}
                        avgRating={avgRating}
                    />
                </div>
            </div>
        </div>
    );
}
