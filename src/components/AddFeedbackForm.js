"use client";

import { useState } from "react";
import { addFeedback } from "@/app/actions/feedbackActions";
import { useRouter } from "next/navigation";

export default function AddFeedbackForm({ students }) {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rating, setRating] = useState(5);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        formData.append("rating", rating);

        const res = await addFeedback(formData);

        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {error && (
                <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <label>Select Student</label>
                    <select name="student_id" required>
                        <option value="">-- Choose a student --</option>
                        {students.map(s => (
                            <option key={s._id} value={s._id}>{s.name} ({s.student_id})</option>
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
                    <label>Rating: {rating} / 5</label>
                    <div className="stars mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <span
                                key={star}
                                className={`star ${star <= rating ? 'filled' : ''}`}
                                onClick={() => setRating(star)}
                                style={{ cursor: 'pointer', fontSize: '1.5rem', transition: 'transform 0.1s', display: 'inline-block' }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                ★
                            </span>
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
