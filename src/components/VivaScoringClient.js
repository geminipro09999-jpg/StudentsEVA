"use client";

import { useState } from "react";
import { findStudentByUT, submitScores, getStudentScores } from "@/app/actions/scoringActions";
import toast from "react-hot-toast";

export default function VivaScoringClient({ viva }) {
    const [utNumber, setUtNumber] = useState("");
    const [student, setStudent] = useState(null);
    const [searching, setSearching] = useState(false);
    const [scores, setScores] = useState({});
    const [existingScores, setExistingScores] = useState([]);
    const [remark, setRemark] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!utNumber.trim()) return;

        setSearching(true);
        setStudent(null);
        setExistingScores([]);
        setScores({});
        setRemark("");

        const res = await findStudentByUT(utNumber.trim());
        if (res.data) {
            setStudent(res.data);
            // Fetch existing scores for this student in this viva
            const scoreRes = await getStudentScores(viva.id, res.data.id);
            if (scoreRes.data) {
                setExistingScores(scoreRes.data);
                // Pre-fill scores if they exist
                const initialScores = {};
                let initialRemark = "";
                scoreRes.data.forEach(s => {
                    initialScores[s.criteria_id] = s.score;
                    if (s.remark) initialRemark = s.remark;
                });
                setScores(initialScores);
                setRemark(initialRemark);
            }
        } else {
            toast.error("Student not found with this UT Number.");
        }
        setSearching(false);
    };

    const updateScore = (criteriaId, value, max) => {
        const val = parseFloat(value);
        if (val > max) {
            toast.error(`Max score for this criteria is ${max}`);
            return;
        }
        setScores({ ...scores, [criteriaId]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all criteria have scores
        const missing = viva.criteria.filter(c => scores[c.id] === undefined || scores[c.id] === "");
        if (missing.length > 0) {
            return toast.error(`Please provide scores for: ${missing.map(m => m.name).join(", ")}`);
        }

        setSubmitting(true);
        const res = await submitScores({
            vivaId: viva.id,
            studentId: student.id,
            scores,
            remark
        });

        if (res.success) {
            toast.success("Scores submitted successfully and locked.");
            // Refresh existing scores
            const scoreRes = await getStudentScores(viva.id, student.id);
            if (scoreRes.data) setExistingScores(scoreRes.data);
        } else {
            toast.error(res.error || "Failed to submit scores");
        }
        setSubmitting(false);
    };

    const isLocked = existingScores.some(s => s.is_locked) || existingScores.some(s => s.is_verified);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="card accent">
                    <h3 className="text-xl font-bold mb-4">Find Student</h3>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input 
                            type="text" 
                            value={utNumber} 
                            onChange={(e) => setUtNumber(e.target.value)}
                            placeholder="Enter UT Number (e.g., UT001)"
                            className="flex-1"
                        />
                        <button type="submit" disabled={searching} className="btn btn-primary">
                            {searching ? "Searching..." : "Search"}
                        </button>
                    </form>
                </div>

                {student && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-24 h-24 rounded-2xl bg-accent-glow flex items-center justify-center font-bold text-3xl text-accent-color overflow-hidden border border-card-border shadow-md" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
                                    {student.photo_url ? (
                                        <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        student.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold">{student.name}</h4>
                                    <p className="text-secondary text-lg">{student.student_id}</p>
                                    <p className="text-tertiary mt-1">{student.course} • Batch {student.batch}</p>
                                    
                                    {(student.history?.length > 0 || student.quizzes?.length > 0) && (
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            {student.history?.length > 0 && (
                                                <span className="badge badge-lecturer" style={{ background: 'var(--accent-glow)', color: 'var(--accent-color)' }}>
                                                    ⭐ {(student.history.reduce((acc, h) => acc + h.rating, 0) / student.history.length).toFixed(1)} Feedback Avg
                                                </span>
                                            )}
                                            {student.quizzes?.length > 0 && (
                                                <span className="badge" style={{ background: 'rgba(66, 133, 244, 0.1)', color: '#4285f4', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
                                                    📝 {student.quizzes.length} Quizzes Completed
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pt-6 border-t border-card-border">
                                {/* Feedback History Section */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase tracking-widest text-accent-color mb-4 flex items-center gap-2">
                                        <span>💬</span> Previous Feedbacks
                                    </h5>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {student.history?.map((h) => (
                                            <div key={h.id} className="p-4 rounded-xl bg-surface-container-low border border-card-border">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-surface-container-highest rounded text-tertiary">{h.category}</span>
                                                    <div className="flex text-warning text-xs">
                                                        {"★".repeat(h.rating)}{"☆".repeat(5-h.rating)}
                                                    </div>
                                                </div>
                                                <p className="text-sm italic text-secondary m-0">"{h.remark}"</p>
                                                <div className="mt-2 flex justify-between items-center text-[10px] text-tertiary">
                                                    <span>By {h.users.name}</span>
                                                    <span>{new Date(h.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!student.history || student.history.length === 0) && (
                                            <p className="text-sm text-tertiary italic text-center py-4">No previous feedback records found.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Quiz History Section */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                        <span>📝</span> Quiz Performance
                                    </h5>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {student.quizzes?.map((q) => (
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
                                        {(!student.quizzes || student.quizzes.length === 0) && (
                                            <p className="text-sm text-tertiary italic text-center py-4">No quiz records found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {student ? (
                    <div className="card animate-fade-in relative">
                        {isLocked && (
                            <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                                <div className="bg-surface-container p-4 rounded-xl shadow-xl border border-card-border flex items-center gap-3">
                                    <span className="text-2xl">🔒</span>
                                    <div>
                                        <p className="font-bold">Scores Locked</p>
                                        <p className="text-xs text-secondary">Contact Admin to make changes.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <h3 className="text-xl font-bold mb-6">Scoring Form</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {viva.criteria.map((c) => (
                                <div key={c.id}>
                                    <div className="flex justify-between mb-2">
                                        <label className="m-0">{c.name}</label>
                                        <span className="text-xs text-secondary">Max: {c.max_marks}</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        min="0"
                                        max={c.max_marks}
                                        value={scores[c.id] || ""}
                                        onChange={(e) => updateScore(c.id, e.target.value, c.max_marks)}
                                        placeholder={`Score (0-${c.max_marks})`}
                                        disabled={isLocked}
                                        required
                                    />
                                </div>
                            ))}

                            <div className="pt-4 border-t border-card-border">
                                <label className="flex items-center gap-2 mb-2">
                                    <span>📝</span> Overall Remark
                                </label>
                                <textarea 
                                    value={remark} 
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="Add overall session feedback, strengths, or areas for improvement..."
                                    rows="4"
                                    className="w-full bg-surface-container border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-accent-color transition-all resize-none"
                                    disabled={isLocked}
                                ></textarea>
                            </div>

                            <button 
                                type="submit" 
                                disabled={submitting || isLocked} 
                                className="btn btn-primary w-full py-4 text-lg"
                            >
                                {submitting ? "Submitting..." : "Submit Scores"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="card h-full flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-lg">Search for a student to start scoring.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
