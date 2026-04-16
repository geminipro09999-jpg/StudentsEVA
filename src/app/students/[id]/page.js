import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    const { data: allLabs } = await supabase.from('lab_activities').select('id, name');

    const usersMap = (allUsers || []).reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
    const labsMap = (allLabs || []).reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

    const feedbacks = (rawFeedbacks || []).map(f => ({
        ...f,
        users: { name: usersMap[f.lecturer_id]?.name || 'Unknown Lecturer' },
        lab_activities: { name: labsMap[f.lab_activity_id]?.name || 'Unknown Lab' }
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
                </div>

                <div className="profile-main">
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
                                                    <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)', marginRight: '0.5rem' }}>{f.lab_activities.name}</span>
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
