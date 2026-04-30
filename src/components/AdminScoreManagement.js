"use client";

import { useState } from "react";
import { verifyScores, updateScoresByAdmin } from "@/app/actions/scoringActions";
import toast from "react-hot-toast";

export default function AdminScoreManagement({ vivaId, student, lecturerId, initialScores, initialRemark, criteria, isVerified }) {
    const [isEditing, setIsEditing] = useState(false);
    const [scores, setScores] = useState(initialScores);
    const [remark, setRemark] = useState(initialRemark || "");
    const [loading, setLoading] = useState(false);

    const handleOpenEdit = () => {
        setRemark(initialRemark || "");
        setIsEditing(true);
    };

    const handleVerify = async () => {
        setLoading(true);
        const res = await verifyScores(vivaId, student.id, lecturerId);
        if (res.success) {
            toast.success("Scores verified successfully");
            window.location.reload(); // Refresh to update server data
        } else {
            toast.error(res.error || "Failed to verify scores");
        }
        setLoading(false);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateScoresByAdmin({
            vivaId,
            studentId: student.id,
            lecturerId,
            scores,
            remark
        });
        if (res.success) {
            toast.success("Scores updated and verified");
            setIsEditing(false);
            window.location.reload();
        } else {
            toast.error(res.error || "Failed to update scores");
        }
        setLoading(false);
    };

    const updateScore = (criteriaId, val) => {
        setScores({ ...scores, [criteriaId]: parseFloat(val) });
    };

    if (isEditing) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface-container p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-scale">
                    <div className="flex items-center gap-5 mb-6 pb-4 border-b border-card-border">
                        <div className="rounded-2xl bg-accent-glow overflow-hidden flex items-center justify-center font-bold text-2xl text-accent-color border border-card-border" style={{ width: '100px', height: '100px', flexShrink: 0 }}>
                            {student.photo_url ? (
                                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                                student.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold m-0">{student.name}</h3>
                            <p className="text-sm text-secondary font-medium mt-1">{student.student_id}</p>
                        </div>
                    </div>
                    
                    <h4 className="text-sm font-bold uppercase tracking-widest text-accent-color mb-4">Edit Evaluation</h4>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        {criteria.map((c) => (
                            <div key={c.id}>
                                <label className="text-xs font-bold text-tertiary uppercase">{c.name} (Max {c.max_marks})</label>
                                <input 
                                    type="number" 
                                    step="0.5"
                                    max={c.max_marks}
                                    min="0"
                                    value={scores[c.id] || 0}
                                    onChange={(e) => updateScore(c.id, e.target.value)}
                                    className="w-full bg-surface-container border-none rounded-xl p-3 text-sm"
                                    required
                                />
                            </div>
                        ))}
                        
                        <div className="pt-4 border-t border-card-border">
                            <label className="text-xs font-bold text-tertiary uppercase mb-2 block">Overall Remark</label>
                            <textarea 
                                value={remark} 
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Edit session feedback..."
                                rows="3"
                                className="w-full bg-surface-container border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent-color transition-all resize-none"
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" disabled={loading} className="btn btn-primary">Save & Verify</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-end gap-2">
            <button 
                onClick={handleOpenEdit} 
                className="btn btn-secondary py-1 px-3 text-xs"
            >
                Edit
            </button>
        </div>
    );
}
