"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateMultiPanelistScores } from "@/app/actions/scoringActions";
import toast from "react-hot-toast";

export default function AdminScoreManagement({ vivaId, student, initialRemark, criteria, panelistData, panelistWeights }) {
    const [isEditing, setIsEditing] = useState(false);
    const [panelistScores, setPanelistScores] = useState({});
    const [remark, setRemark] = useState(initialRemark || "");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Initialize panelist scores from panelistData
    useEffect(() => {
        if (panelistData) {
            const initial = {};
            Object.entries(panelistData).forEach(([lId, data]) => {
                initial[lId] = { ...data.scores };
            });
            setPanelistScores(initial);
        }
    }, [panelistData, isEditing]);

    const handleOpenEdit = () => {
        setRemark(initialRemark || "");
        setIsEditing(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateMultiPanelistScores({
            vivaId,
            studentId: student.id,
            panelistScores,
            remark
        });
        if (res.success) {
            toast.success("All panelist scores updated and verified");
            setIsEditing(false);
            window.location.reload();
        } else {
            toast.error(res.error || "Failed to update scores");
        }
        setLoading(false);
    };

    const updateIndividualScore = (lId, cId, val) => {
        setPanelistScores(prev => ({
            ...prev,
            [lId]: {
                ...(prev[lId] || {}),
                [cId]: val // Store as string to allow typing decimals like "22."
            }
        }));
    };

    // Calculate live weighted result for preview
    const getWeightedResult = (cId) => {
        let total = 0;
        Object.entries(panelistScores).forEach(([lId, scores]) => {
            const score = parseFloat(scores[cId]) || 0;
            const weight = panelistWeights[lId] || 0;
            total += (score * weight) / 100;
        });
        return parseFloat(total.toFixed(2));
    };

    if (isEditing) {
        const modalContent = (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-surface-container p-6 rounded-2xl w-full max-w-[98vw] shadow-2xl animate-fade-in-scale max-h-[95vh] overflow-y-auto border border-card-border/50">
                    <div className="flex items-center gap-5 mb-6 pb-4 border-b border-card-border">
                        <div className="rounded-2xl bg-accent-glow overflow-hidden flex items-center justify-center font-bold text-2xl text-accent-color border border-card-border" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                            {student.photo_url ? (
                                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                                student.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold m-0">{student.name}</h3>
                            <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-1">{student.student_id}</p>
                        </div>
                    </div>
                    
                    <h4 className="text-xs font-bold uppercase tracking-widest text-accent-color mb-4 flex items-center gap-2">
                        <span>✍️</span> Edit Panelist Scores
                    </h4>

                    <form onSubmit={handleUpdate}>
                        <div className="overflow-x-auto rounded-xl border border-card-border mb-6 shadow-inner">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-surface-container-high">
                                    <tr>
                                        <th className="p-3 text-[10px] uppercase font-bold text-tertiary">Panelist</th>
                                        <th className="p-3 text-[10px] uppercase font-bold text-tertiary text-center">Weight</th>
                                        {criteria.map(c => (
                                            <th key={c.id} className="p-3 text-[10px] uppercase font-bold text-tertiary text-center">
                                                {c.name}<br/>
                                                <span className="opacity-50 text-[8px]">(Max {c.max_marks})</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(panelistData || {}).map(([pId, data]) => (
                                        <tr key={pId} className="border-t border-card-border hover:bg-surface-container-low/50 transition-colors">
                                            <td className="p-3">
                                                <p className="text-xs font-bold m-0">{data.name}</p>
                                                <p className="text-[8px] text-tertiary uppercase">Assigned Panelist</p>
                                            </td>
                                            <td className="p-3 text-xs text-center font-bold text-accent-color">{panelistWeights[pId]}%</td>
                                            {criteria.map(c => (
                                                <td key={c.id} className="p-2">
                                                    <div className="relative group">
                                                        <input 
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={panelistScores[pId]?.[c.id] ?? ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                    const numVal = parseFloat(val);
                                                                    if (!isNaN(numVal) && numVal > c.max_marks) {
                                                                        updateIndividualScore(pId, c.id, c.max_marks.toString());
                                                                    } else {
                                                                        updateIndividualScore(pId, c.id, val);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full bg-surface-container-highest border border-card-border/50 rounded-lg p-2 text-sm font-bold text-center focus:ring-2 focus:ring-accent-color/30 outline-none transition-all group-hover:border-accent-color/30"
                                                            placeholder={`Max ${c.max_marks}`}
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-accent-glow/5 border-t-2 border-accent-color/20">
                                    <tr className="bg-surface-container-highest/30">
                                        <td colSpan="2" className="p-3 text-xs font-bold text-accent-color">Weighted Result (Auto-Calculated)</td>
                                        {criteria.map(c => (
                                            <td key={c.id} className="p-3 text-sm text-center font-black text-accent-color">
                                                {getWeightedResult(c.id)}
                                            </td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-2 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-tertiary uppercase mb-2 block tracking-widest">Final Evaluation Remark</label>
                                    <textarea 
                                        value={remark} 
                                        onChange={(e) => setRemark(e.target.value)}
                                        placeholder="Enter overall feedback for this student's performance..."
                                        rows="3"
                                        className="w-full bg-surface-container-highest border border-card-border/50 rounded-xl p-4 text-sm focus:ring-2 focus:ring-accent-color/30 outline-none transition-all resize-none shadow-sm"
                                    ></textarea>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary flex-1 py-3 text-xs font-bold tracking-widest uppercase">Cancel</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-3 shadow-glow text-xs font-bold tracking-widest uppercase">
                                        {loading ? "Synchronizing..." : "Save All Changes"}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-surface-container-low p-5 rounded-2xl border border-card-border/50 shadow-sm">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-color mb-3">Admin Controls</h4>
                                <ul className="text-[11px] text-secondary space-y-4 p-0 m-0 list-none">
                                    <li className="flex gap-3">
                                        <span className="text-accent-color font-bold">1.</span>
                                        <span>Edit <strong>individual panelist marks</strong> directly in the table cells.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-accent-color font-bold">2.</span>
                                        <span>The <strong>Weighted Result</strong> row calculates automatically based on panelist weights.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-accent-color font-bold">3.</span>
                                        <span>Saving will update <strong>multiple database records</strong> simultaneously.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );

        const editButton = (
            <div className="flex justify-end gap-2">
                <button 
                    onClick={handleOpenEdit} 
                    className="btn btn-secondary py-1 px-3 text-xs font-bold tracking-wider uppercase border border-card-border/50 hover:bg-accent-glow/10 hover:text-accent-color transition-all opacity-0"
                    disabled
                >
                    Edit Scores
                </button>
            </div>
        );

        return (
            <>
                {editButton}
                {mounted && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}
            </>
        );
    }

    return (
        <div className="flex justify-end gap-2">
            <button 
                onClick={handleOpenEdit} 
                className="btn btn-secondary py-1 px-3 text-xs font-bold tracking-wider uppercase border border-card-border/50 hover:bg-accent-glow/10 hover:text-accent-color transition-all"
            >
                Edit Scores
            </button>
        </div>
    );
}
