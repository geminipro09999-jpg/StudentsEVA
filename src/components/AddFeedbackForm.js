"use client";

import { useState, useEffect } from "react";
import { addFeedback } from "@/app/actions/feedbackActions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const RATING_LABELS = [
    { value: 5, label: "Excellent", color: "#10b981", icon: "💎" },
    { value: 4, label: "Very Good", color: "#0ea5e9", icon: "🌟" },
    { value: 3, label: "Good", color: "#3b82f6", icon: "✨" },
    { value: 2, label: "Average", color: "#f59e0b", icon: "⚠️" },
    { value: 1, label: "Bad", color: "#ef4444", icon: "❌" }
];

export default function AddFeedbackForm({ students, initialSubjects, initialLabActivities, userRole, initialStudentId }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [rating, setRating] = useState(5); // Default to Excellent

    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedLabActivity, setSelectedLabActivity] = useState("");
    const [studentSelection, setStudentSelection] = useState("");

    useEffect(() => {
        if (initialStudentId) {
            const student = students.find(s => s.id === initialStudentId || s._id === initialStudentId);
            if (student) {
                setStudentSelection(`${student.name} - ${student.student_id}`);
            }
        }
    }, [initialStudentId, students]);

    const filteredLabActivities = selectedSubject
        ? initialLabActivities.filter(l => l.subject_id === selectedSubject)
        : initialLabActivities;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        // Match the string back to the student object
        const studentSearchValue = formData.get("student_selection");
        const foundStudent = students.find(s => `${s.name} - ${s.student_id}` === studentSearchValue);

        if (!foundStudent) {
            toast.error("Please explicitly select a valid student from the dropdown options.");
            setLoading(false);
            return;
        }

        // Add the real ID
        formData.append("student_id", foundStudent._id);
        formData.append("rating", rating);
        formData.delete("student_selection");

        const res = await addFeedback(formData);

        if (res.error) {
            toast.error(res.error);
            setLoading(false);
        } else {
            toast.success("Feedback submitted successfully!");
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <label>Select Student (Name or UT Number)</label>
                    <input
                        list="students_list"
                        name="student_selection"
                        value={studentSelection}
                        onChange={(e) => setStudentSelection(e.target.value)}
                        placeholder="Type to search student name or UT number..."
                        required
                        autoComplete="off"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}
                    />
                    <datalist id="students_list">
                        {students.map(s => (
                            <option key={s._id} value={`${s.name} - ${s.student_id}`} />
                        ))}
                    </datalist>
                </div>

                <div style={{ position: 'relative' }}>
                    <label>Filter by Subject (Optional)</label>
                    <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedLabActivity(""); }} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        <option value="">-- All Subjects --</option>
                        {initialSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                    </select>

                    <label>Lab Activity</label>
                    <select name="lab_activity_id" value={selectedLabActivity} onChange={e => setSelectedLabActivity(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                        <option value="" disabled>-- Select Lab Activity --</option>
                        {filteredLabActivities.map(lab => (
                            <option key={lab.id} value={lab.id}>{lab.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Category</label>
                    <select name="category" required>
                        <option value="Performance">Performance</option>
                        <option value="Discipline">Discipline</option>
                        <option value="Attendance">Attendance</option>
                        <option value="Behavior">Behavior</option>
                    </select>
                </div>

                <div>
                    <label>Remark / Comments</label>
                    <textarea name="remark" rows={4} placeholder="Detailed observations..." required></textarea>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label style={{ fontWeight: '600' }}>Evaluation Rating</label>
                        <span style={{
                            fontWeight: '700',
                            color: RATING_LABELS.find(r => r.value === rating)?.color,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.8rem',
                            borderRadius: '2rem',
                            background: `${RATING_LABELS.find(r => r.value === rating)?.color}15`,
                            border: `1px solid ${RATING_LABELS.find(r => r.value === rating)?.color}40`
                        }}>
                            {RATING_LABELS.find(r => r.value === rating)?.icon} {RATING_LABELS.find(r => r.value === rating)?.label}
                        </span>
                    </div>

                    <div className="flex gap-1" style={{ justifyContent: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                        {[5, 4, 3, 2, 1].map((star) => (
                            <div
                                key={star}
                                onClick={() => setRating(star)}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    transform: rating >= star ? 'scale(1.2)' : 'scale(1)',
                                    padding: '0 0.25rem'
                                }}
                            >
                                <svg
                                    width="42"
                                    height="42"
                                    viewBox="0 0 24 24"
                                    fill={rating >= star ? (RATING_LABELS.find(r => r.value === rating)?.color) : "rgba(255,255,255,0.1)"}
                                    style={{
                                        filter: rating >= star ? `drop-shadow(0 0 8px ${RATING_LABELS.find(r => r.value === star)?.color}60)` : 'none',
                                        transition: 'fill 0.3s'
                                    }}
                                >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary mt-2" style={{ padding: '1rem' }}>
                    {loading ? "Submitting..." : "Submit Feedback"}
                </button>
            </form>
        </div>
    );
}
