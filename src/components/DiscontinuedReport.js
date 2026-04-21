"use client";

import { useState, useTransition } from "react";
import { reactivateStudent } from "@/app/actions/discontinueStudent";
import { useRouter } from "next/navigation";

export default function DiscontinuedReport({ students }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [actionId, setActionId] = useState(null);
    const [message, setMessage] = useState(null);

    const handleReactivate = (studentId) => {
        setActionId(studentId);
        setMessage(null);
        startTransition(async () => {
            const res = await reactivateStudent(studentId);
            if (res.error) {
                setMessage({ type: 'error', text: res.error });
            } else {
                setMessage({ type: 'success', text: 'Student reactivated successfully.' });
                router.refresh();
            }
            setActionId(null);
        });
    };

    const handleExportCSV = () => {
        const headers = ["Student ID", "Name", "Course", "Batch", "Group", "Reason", "Date Discontinued"];
        const rows = students.map(s => [
            s.student_id,
            s.name,
            s.course,
            s.batch,
            s.group_name || "No Group",
            `"${(s.discontinue_reason || "").replace(/"/g, '""')}"`,
            s.discontinued_at ? new Date(s.discontinued_at).toLocaleDateString('en-GB') : "N/A",
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `discontinued-students-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 wrap gap-4">
                <div>
                    <h3 className="text-2xl font-bold m-0">🔴 Discontinued Students</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        {students.length} student{students.length !== 1 ? 's' : ''} discontinued
                    </p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', fontWeight: '600' }}
                    disabled={students.length === 0}
                >
                    📥 Export CSV
                </button>
            </div>

            {/* Toast message */}
            {message && (
                <div
                    className="mb-4 p-3"
                    style={{
                        background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: message.type === 'success' ? '#10b981' : 'var(--danger)',
                        border: `1px solid ${message.type === 'success' ? '#10b981' : 'var(--danger)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                    }}
                >
                    {message.text}
                </div>
            )}

            {students.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No discontinued students</p>
                    <p style={{ fontSize: '0.9rem' }}>All students are currently active.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Course &amp; Batch</th>
                                <th>Group</th>
                                <th>Reason</th>
                                <th>Date Discontinued</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        {s.photo_url ? (
                                            <img
                                                src={s.photo_url}
                                                alt="profile"
                                                style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--card-border)', filter: 'grayscale(40%)' }}
                                            />
                                        ) : (
                                            <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#ef4444', border: '2px solid rgba(239,68,68,0.2)' }}>
                                                N/A
                                            </div>
                                        )}
                                    </td>
                                    <td className="font-semibold">{s.student_id}</td>
                                    <td className="font-medium">{s.name}</td>
                                    <td>
                                        <div style={{ fontSize: '0.9rem' }}>{s.course}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.batch}</div>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                                            {s.group_name || 'No Group'}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '220px' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {s.discontinue_reason || <em>No reason provided</em>}
                                        </p>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {s.discontinued_at
                                            ? new Date(s.discontinued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '—'
                                        }
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleReactivate(s.id)}
                                            disabled={isPending && actionId === s.id}
                                            className="btn btn-primary"
                                            style={{
                                                fontSize: '0.8rem',
                                                padding: '0.4rem 0.9rem',
                                                background: 'rgba(16,185,129,0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16,185,129,0.3)',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {isPending && actionId === s.id ? 'Reactivating...' : '✅ Reactivate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
