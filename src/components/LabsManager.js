"use client";

import { useState } from "react";
import { addSubject, deleteSubject, addLabActivity, deleteLabActivity } from "@/app/actions/labActivityActions";
import { useRouter } from "next/navigation";

export default function LabsManager({ initialSubjects, initialActivities }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");
    const [newActivityName, setNewActivityName] = useState("");
    const [selectedTargetSubject, setSelectedTargetSubject] = useState("");

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        if (!newSubjectName.trim()) return;
        setLoading(true);
        await addSubject(newSubjectName);
        setNewSubjectName("");
        setLoading(false);
        router.refresh();
    };

    const handleCreateActivity = async (e) => {
        e.preventDefault();
        if (!newActivityName.trim() || !selectedTargetSubject) return;
        setLoading(true);
        await addLabActivity(newActivityName, selectedTargetSubject);
        setNewActivityName("");
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
                        className="flex-1 p-2 rounded border"
                        style={{ border: '1px solid var(--card-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
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
                        className="p-2 rounded border"
                        style={{ border: '1px solid var(--card-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                        required
                        disabled={loading}
                    >
                        <option value="">-- Choose Subject --</option>
                        {initialSubjects.map(sub => (
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
                    <button type="submit" className="btn btn-primary mt-1" disabled={loading}>Attach Activity</button>
                </form>
            </div>

            <div className="card">
                <h3 className="text-xl font-bold mb-4">Live Layout Structure</h3>
                {initialSubjects.length === 0 && (
                    <p className="text-secondary italic">No subjects or activities bound yet. Create one to begin!</p>
                )}
                <div className="flex flex-col gap-4">
                    {initialSubjects.map(sub => {
                        const boundActivities = initialActivities.filter(act => act.subject_id === sub.id);
                        return (
                            <div key={sub.id} className="p-4 rounded border relative" style={{ border: '1px solid var(--card-border)', background: 'var(--bg-color)' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-lg text-primary">{sub.name}</h4>
                                    <button
                                        className="text-xs text-danger hover:underline"
                                        onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${sub.name} and ALL of its activities?`)) {
                                                setLoading(true);
                                                await deleteSubject(sub.id);
                                                setLoading(false);
                                                router.refresh();
                                            }
                                        }}
                                    >
                                        Delete Subject
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 mt-3 p-2 bg-black/20 rounded">
                                    {boundActivities.length === 0 && <span className="text-xs text-secondary">No lab activities bound under this subject yet.</span>}
                                    {boundActivities.map(act => (
                                        <div key={act.id} className="flex justify-between items-center text-sm p-1">
                                            <span>&#x2022; {act.name}</span>
                                            <button
                                                className="text-xs text-danger opacity-60 hover:opacity-100 hover:scale-110 transition"
                                                onClick={async () => {
                                                    setLoading(true);
                                                    await deleteLabActivity(act.id);
                                                    setLoading(false);
                                                    router.refresh();
                                                }}
                                                title="Delete Activity"
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
