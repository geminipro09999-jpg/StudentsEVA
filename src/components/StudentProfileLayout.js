"use client";

import { useState } from "react";

export default function StudentProfileLayout({ 
    student, 
    vivas, 
    quizzes, 
    attendance, 
    feedbacks,
    ratingMap,
    monthNames,
    sessionRole,
    avgRating
}) {
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview", icon: "🏠" },
        { id: "vivas", label: "Vivas", icon: "🎤", count: Object.keys(vivas).length },
        { id: "quizzes", label: "Quizzes", icon: "📝", count: quizzes.length },
        { id: "attendance", label: "Attendance", icon: "📋", count: attendance.length },
        { id: "feedback", label: "Feedback", icon: "💬", count: feedbacks.length }
    ];

    const renderOverview = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Latest Viva */}
                <div className="p-5 rounded-2xl bg-surface-container-low border border-card-border">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold m-0 flex items-center gap-2"><span>🎤</span> Latest Viva</h4>
                        <button onClick={() => setActiveTab("vivas")} className="text-[10px] uppercase font-black text-accent-color hover:underline">View All</button>
                    </div>
                    {Object.keys(vivas).length > 0 ? (
                        <div>
                            <p className="font-bold text-primary">{Object.values(vivas)[0].name}</p>
                            <p className="text-2xl font-black mt-2">
                                {Object.values(vivas)[0].total} <span className="text-xs text-secondary">/ {Object.values(vivas)[0].maxTotal}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-tertiary italic">No sessions yet</p>
                    )}
                </div>

                {/* Latest Quiz */}
                <div className="p-5 rounded-2xl bg-surface-container-low border border-card-border">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold m-0 flex items-center gap-2"><span>📝</span> Latest Quiz</h4>
                        <button onClick={() => setActiveTab("quizzes")} className="text-[10px] uppercase font-black text-accent-color hover:underline">View All</button>
                    </div>
                    {quizzes.length > 0 ? (
                        <div>
                            <p className="font-bold text-primary">{quizzes[0].quiz_name}</p>
                            <p className="text-2xl font-black mt-2">
                                {quizzes[0].marks} <span className="text-xs text-secondary">/ {quizzes[0].total_marks}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-tertiary italic">No marks yet</p>
                    )}
                </div>
            </div>

            {/* Latest Feedback */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-card-border">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold m-0 flex items-center gap-2"><span>💬</span> Latest Feedback</h4>
                    <button onClick={() => setActiveTab("feedback")} className="text-[10px] uppercase font-black text-accent-color hover:underline">View All</button>
                </div>
                {feedbacks.length > 0 ? (
                    <div className="p-4 rounded-xl bg-surface/30 border border-card-border/50">
                         <div className="flex justify-between items-center mb-3">
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>{feedbacks[0].category}</span>
                            <div className="flex items-center gap-1">
                                <span style={{ color: ratingMap[feedbacks[0].rating]?.color, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    {ratingMap[feedbacks[0].rating]?.label}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm italic m-0">"{feedbacks[0].remark}"</p>
                    </div>
                ) : (
                    <p className="text-sm text-tertiary italic">No feedback yet</p>
                )}
            </div>
        </div>
    );

    const renderVivas = () => (
        <div className="space-y-4 animate-fade-in">
            {Object.values(vivas).map((viva, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-surface-container-low border border-card-border hover:border-accent-color/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="text-lg font-bold m-0 text-primary">{viva.name}</h4>
                            <p className="text-[10px] text-tertiary uppercase font-bold tracking-widest mt-1">{new Date(viva.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-accent-color m-0">{viva.total} / {viva.maxTotal}</p>
                            <span className="text-xs font-bold text-secondary">Overall: {((viva.total / viva.maxTotal) * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {viva.metrics.map((m, midx) => (
                            <div key={midx} className="p-2 px-3 rounded-lg bg-surface/40 border border-card-border/50 flex justify-between items-center">
                                <span className="text-[11px] font-semibold text-secondary truncate mr-2">{m.name}</span>
                                <span className="text-[11px] font-bold whitespace-nowrap">{m.score}/{m.max}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {Object.keys(vivas).length === 0 && <p className="text-center py-10 text-tertiary italic">No viva sessions recorded.</p>}
        </div>
    );

    const renderQuizzes = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
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
            {quizzes.length === 0 && <p className="col-span-full text-center py-10 text-tertiary italic">No quiz marks recorded.</p>}
        </div>
    );

    const renderAttendance = () => (
        <div className="glass-card p-0 overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-container-highest/50 text-[10px] uppercase tracking-widest text-secondary">
                            <th className="p-4">Month</th>
                            <th className="p-4">Year</th>
                            <th className="p-4">Present</th>
                            <th className="p-4">Total</th>
                            <th className="p-4">Percentage</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                        {attendance.map((rec) => {
                            const pct = rec.total_days > 0 ? ((rec.present_days / rec.total_days) * 100) : 0;
                            const color = pct >= 75 ? 'var(--success-color)' : pct >= 50 ? 'var(--warning-color)' : 'var(--danger-color)';
                            return (
                                <tr key={rec.id} className="hover:bg-surface-container-low/50">
                                    <td className="p-4 font-bold text-sm">{monthNames[rec.month]}</td>
                                    <td className="p-4 text-sm text-secondary">{rec.year}</td>
                                    <td className="p-4 text-sm font-bold">{rec.present_days}</td>
                                    <td className="p-4 text-sm text-tertiary">{rec.total_days}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                                                <div className="h-full" style={{ width: `${pct}%`, background: color }}></div>
                                            </div>
                                            <span className="text-xs font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
                                            {pct >= 75 ? 'GOOD' : pct >= 50 ? 'AVERAGE' : 'AT RISK'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {attendance.length === 0 && <p className="text-center py-10 text-tertiary italic">No attendance records found.</p>}
        </div>
    );

    const renderFeedback = () => (
        <div className="space-y-4 animate-fade-in">
            {sessionRole !== 'admin' ? (
                <div className="p-8 rounded-2xl border border-dashed border-card-border text-center">
                    <p className="text-2xl mb-2">🔒</p>
                    <p className="text-secondary italic text-sm">Detailed feedback history is restricted to Administrators.</p>
                </div>
            ) : feedbacks.map(f => (
                <div key={f.id} className="p-5 rounded-2xl bg-surface-container-low border border-card-border">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-wrap gap-2">
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>{f.category}</span>
                            {f.lab_activities?.name && (
                                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>
                                    {f.lab_activities.subjectName ? `${f.lab_activities.subjectName}: ` : ''}{f.lab_activities.name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{ratingMap[f.rating]?.icon}</span>
                            <span className="text-xs font-bold" style={{ color: ratingMap[f.rating]?.color }}>{ratingMap[f.rating]?.label}</span>
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed text-secondary mb-3">"{f.remark}"</p>
                    <div className="flex justify-between items-center pt-3 border-t border-card-border/30 text-[10px] text-tertiary uppercase font-bold tracking-widest">
                        <span>By {f.users?.name || 'Unknown'}</span>
                        <span>{new Date(f.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                </div>
            ))}
            {feedbacks.length === 0 && <p className="text-center py-10 text-tertiary italic">No feedback records found.</p>}
        </div>
    );

    return (
        <div className="profile-main">
            {/* Nav Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 p-1 bg-surface-container-highest/20 rounded-2xl border border-card-border/50 sticky top-4 z-20 backdrop-blur-md">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all whitespace-nowrap text-sm font-bold ${
                            activeTab === tab.id 
                            ? 'bg-primary-gradient text-white shadow-lg' 
                            : 'hover:bg-surface-container-highest/50 text-secondary'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                activeTab === tab.id ? 'bg-white/20' : 'bg-surface-container-highest'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content Container with max height for high-volume data */}
            <div className="max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === "overview" && renderOverview()}
                {activeTab === "vivas" && renderVivas()}
                {activeTab === "quizzes" && renderQuizzes()}
                {activeTab === "attendance" && renderAttendance()}
                {activeTab === "feedback" && renderFeedback()}
            </div>
        </div>
    );
}
