"use client";

import { useState, useEffect } from "react";
import { addSubject, deleteSubject, addLabActivity, deleteLabActivity } from "@/app/actions/labActivityActions";
import { useRouter } from "next/navigation";

export default function LabsManager({ initialSubjects, initialActivities }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState(initialSubjects);
    const [activities, setActivities] = useState(initialActivities);
    const [newSubjectName, setNewSubjectName] = useState("");
    const [newActivityName, setNewActivityName] = useState("");
    const [selectedTargetSubject, setSelectedTargetSubject] = useState("");

    // Sync with props when refreshed
    useEffect(() => {
        setSubjects(initialSubjects);
        setActivities(initialActivities);
    }, [initialSubjects, initialActivities]);

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        if (!newSubjectName.trim()) return;
        setLoading(true);
        const res = await addSubject(newSubjectName);
        if (res && res.data) {
            setSubjects([...subjects, res.data]);
            setNewSubjectName("");
        } else if (res && res.error) {
            alert("Error: " + res.error);
        }
        setLoading(false);
        router.refresh();
    };

    const handleCreateActivity = async (e) => {
        e.preventDefault();
        if (!newActivityName.trim() || !selectedTargetSubject) return;
        setLoading(true);
        const res = await addLabActivity(newActivityName, selectedTargetSubject);
        if (res && res.data) {
            setActivities([...activities, res.data]);
            setNewActivityName("");
        } else if (res && res.error) {
            alert("Error: " + res.error);
        }
        setLoading(false);
        router.refresh();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card">
                <h3 className="text-xl font-bold mb-4">1. Create a Topic / Subject</h3>
                <form onSubmit={handleCreateSubject} className="mb-6 flex gap-2">
                    <input
                        type="text"
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        placeholder="e.g. Graphic Design"
                        disabled={loading}
                        required
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>Create Subject</button>
                </form>

                <h3 className="text-xl font-bold mb-4 mt-8">2. Attach an Activity to a Subject</h3>
                <form onSubmit={handleCreateActivity} className="flex flex-col gap-3">
                    <select
                        value={selectedTargetSubject}
                        onChange={e => setSelectedTargetSubject(e.target.value)}
                        required
                        disabled={loading}
                    >
                        <option value="">-- Choose Subject --</option>
                        {subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        value={newActivityName}
                        onChange={e => setNewActivityName(e.target.value)}
                        placeholder="e.g. Lab Act 01"
                        className="p-2 rounded border w-full"
                        style={{ border: '1px solid var(--card-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                        disabled={loading}
                        required
                    />
                    <button type="submit" className="btn btn-primary mt-2 w-full" disabled={loading}>Attach Activity</button>
                </form>
            </div>

            <div className="glass-card">
                <div className="section-header">
                    <h2>Live Layout Structure</h2>
                    <p>Current subjects and bound activities</p>
                </div>
                {subjects.length === 0 && (
                    <div className="text-center py-8 opacity-50">
                        <div className="text-4xl mb-2">📭</div>
                        <p>No subjects or activities bound yet.</p>
                    </div>
                )}
                <div className="flex flex-col gap-4 mt-4">
                    {subjects.map(sub => {
                        const boundActivities = activities.filter(act => act.subject_id === sub.id);
                        return (
                            <div key={sub.id} className="p-4 rounded-xl border border-card-border bg-card-bg-solid shadow-sm relative group animate-fade-in">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-base text-accent">{sub.name}</h4>
                                    <button
                                        className="text-xs text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${sub.name}?`)) {
                                                setLoading(true);
                                                const res = await deleteSubject(sub.id);
                                                if (!res.error) {
                                                    setSubjects(subjects.filter(s => s.id !== sub.id));
                                                }
                                                setLoading(false);
                                                router.refresh();
                                            }
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 p-3 bg-black/10 rounded-lg">
                                    {boundActivities.length === 0 && <span className="text-xs text-secondary opacity-60 italic">No lab activities bound.</span>}
                                    {boundActivities.map(act => (
                                        <div key={act.id} className="flex justify-between items-center text-sm p-1 hover:bg-white/5 rounded px-2 group/act">
                                            <span className="text-secondary">&#x2022; {act.name}</span>
                                            <button
                                                className="text-xs text-danger opacity-0 group-hover/act:opacity-100 transition-opacity"
                                                onClick={async () => {
                                                    setLoading(true);
                                                    const res = await deleteLabActivity(act.id);
                                                    if (!res.error) {
                                                        setActivities(activities.filter(a => a.id !== act.id));
                                                    }
                                                    setLoading(false);
                                                    router.refresh();
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
