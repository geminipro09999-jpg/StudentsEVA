"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";

const STATUS_MAP = {
    pending: { label: 'Pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: '🟡' },
    approved: { label: 'Approved', color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: '✅' },
    rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: '❌' },
};

export default function TimesheetAdmin({ entries, lecturers }) {
    const [filterLecturer, setFilterLecturer] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending');
    const [selected, setSelected] = useState(new Set());
    const [adminNote, setAdminNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [localEntries, setLocalEntries] = useState(entries || []);
    const [savingId, setSavingId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const onLocalChange = (id, field, value) => {
        setLocalEntries(prev => prev.map(e => {
            if (e.id !== id) return e;
            const updated = { ...e, [field]: value };

            if (field === 'in_time' || field === 'out_time') {
                if (updated.in_time && updated.out_time) {
                    const [inH, inM] = updated.in_time.split(':').map(Number);
                    const [outH, outM] = updated.out_time.split(':').map(Number);

                    let diff = (outH + outM / 60) - (inH + inM / 60);
                    if (diff < 0) diff += 24;
                    // Standard payroll rounding to 2 decimal places
                    updated.hours = Number(diff.toFixed(2));
                }
            }
            return updated;
        }));
    };

    async function handleQuickApprove(id) {
        setLoading(true);
        try {
            const res = await fetch('/api/timesheet/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id], action: 'approved' }),
            });
            if (res.ok) {
                toast.success("✅ Entry Approved");
                setLocalEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' } : e));
            } else {
                toast.error("Failed to approve");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveAll() {
        setLoading(true);
        try {
            // Save all locally modified entries (we could optimize this to only save 'dirty' ones)
            const pendingEntries = localEntries.filter(e => e.status === 'pending');
            const promises = pendingEntries.map(e =>
                fetch('/api/timesheet/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: e.id,
                        work_date: e.work_date,
                        in_time: e.in_time,
                        out_time: e.out_time,
                        hours: e.hours
                    }),
                })
            );
            await Promise.all(promises);
            toast.success("💾 All changes saved!");
            setIsEditMode(false);
        } catch {
            toast.error("Error saving some entries");
        } finally {
            setLoading(false);
        }
    }

    async function saveEntry(entry) {
        setSavingId(entry.id);
        try {
            const res = await fetch('/api/timesheet/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: entry.id,
                    work_date: entry.work_date,
                    in_time: entry.in_time,
                    out_time: entry.out_time,
                    hours: entry.hours
                }),
            });
            if (res.ok) {
                toast.success("Entry updated");
            } else {
                toast.error("Failed to save");
            }
        } catch {
            toast.error("Error saving");
        } finally {
            setSavingId(null);
        }
    }

    const lecturerMap = useMemo(() => {
        const m = {};
        (lecturers || []).forEach(l => { m[l.id] = l.name; });
        return m;
    }, [lecturers]);

    const filtered = useMemo(() => {
        return (localEntries || []).filter(e => {
            if (filterLecturer && e.lecturer_id !== filterLecturer) return false;
            if (filterStatus && e.status !== filterStatus) return false;
            return true;
        });
    }, [localEntries, filterLecturer, filterStatus]);

    function toggleAll() {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(e => e.id)));
        }
    }

    function toggle(id) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    async function handleAction(action) {
        if (selected.size === 0) {
            toast.error("Select at least one entry");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/timesheet/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selected), action, admin_note: adminNote }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed');
            } else {
                toast.success(`${action === 'approved' ? '✅ Approved' : '❌ Rejected'} ${data.count} entries`);
                setSelected(new Set());
                setAdminNote('');
                window.location.reload();
            }
        } catch {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }

    // Summary stats
    const pendingCount = (localEntries || []).filter(e => e.status === 'pending').length;
    const approvedHours = (localEntries || []).filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.hours), 0);

    return (
        <div className="animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Pending Review', value: pendingCount, icon: '🟡', color: '#fbbf24' },
                    { label: 'Approved Hours', value: approvedHours.toFixed(1) + 'h', icon: '✅', color: 'var(--success)' },
                    { label: 'Total Entries', value: (entries || []).length, icon: '📋', color: 'var(--accent-color)' },
                ].map(c => (
                    <div key={c.label} className="glass-card compact-card text-center flex flex-col items-center justify-center">
                        <div className="text-xl mb-1">{c.icon}</div>
                        <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
                        <div className="text-[10px] text-secondary mt-1 font-medium tracking-wide uppercase">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card compact-card p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wider">Lecturer</label>
                        <select value={filterLecturer} onChange={e => setFilterLecturer(e.target.value)} className="w-full">
                            <option value="">All Lecturers</option>
                            {(lecturers || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wider">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full">
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wider">Bulk Note</label>
                        <input type="text" placeholder="Optional note for selected..." value={adminNote} onChange={e => setAdminNote(e.target.value)} className="w-full" />
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`btn ${isEditMode ? 'btn-danger' : 'btn-secondary'} px-4 py-2 flex items-center gap-2`}
                    >
                        {isEditMode ? '🚫 Cancel Edit' : '✏️ Edit Mode'}
                    </button>
                    {isEditMode && (
                        <button onClick={handleSaveAll} className="btn btn-primary px-4 py-2 flex items-center gap-2" disabled={loading}>
                            💾 Save All Changes
                        </button>
                    )}
                </div>
                {selected.size > 0 && (
                    <div className="flex gap-3 items-center wrap p-2 bg-accent/10 border border-accent/20 rounded-xl animate-scale-in">
                        <span className="text-xs font-bold text-accent ml-2">{selected.size} selected</span>
                        <button onClick={() => handleAction('approved')} className="btn btn-primary text-xs py-1" disabled={loading}>
                            ✅ Approve
                        </button>
                        <button onClick={() => handleAction('rejected')} className="btn btn-danger text-xs py-1" disabled={loading}>
                            ❌ Reject
                        </button>
                        <button onClick={() => setSelected(new Set())} className="btn btn-secondary text-[10px] py-1">Cancel</button>
                    </div>
                )}
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="glass-card text-center py-12">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-secondary font-medium">No entries matching your search.</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="table-container">
                        <table className="data-table compact-table">
                            <thead>
                                <tr>
                                    <th className="w-10 text-center">
                                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                                    </th>
                                    {['Lecturer', 'Date', 'In', 'Out', 'Hours', 'Status', 'Note'].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => {
                                    const s = STATUS_MAP[e.status] || STATUS_MAP.pending;
                                    return (
                                        <tr key={e.id}>
                                            <td className="text-center">
                                                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                                            </td>
                                            <td className="font-bold text-primary">{e.users?.name || lecturerMap[e.lecturer_id] || 'Unknown'}</td>
                                            <td className="whitespace-nowrap">
                                                {isEditMode && e.status === 'pending' ? (
                                                    <input
                                                        type="date"
                                                        value={e.work_date ? new Date(e.work_date).toISOString().split('T')[0] : ''}
                                                        onChange={e2 => onLocalChange(e.id, 'work_date', e2.target.value)}
                                                        className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-32 focus:border-primary"
                                                    />
                                                ) : (
                                                    new Date(e.work_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                )}
                                            </td>
                                            <td className="font-mono text-xs opacity-70">
                                                {isEditMode && e.status === 'pending' ? (
                                                    <input
                                                        type="time"
                                                        value={e.in_time?.slice(0, 5) || ''}
                                                        onChange={e2 => onLocalChange(e.id, 'in_time', e2.target.value)}
                                                        className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-20 focus:border-primary"
                                                    />
                                                ) : (
                                                    e.in_time?.slice(0, 5)
                                                )}
                                            </td>
                                            <td className="font-mono text-xs opacity-70">
                                                {isEditMode && e.status === 'pending' ? (
                                                    <input
                                                        type="time"
                                                        value={e.out_time?.slice(0, 5) || ''}
                                                        onChange={e2 => onLocalChange(e.id, 'out_time', e2.target.value)}
                                                        className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-20 focus:border-primary"
                                                    />
                                                ) : (
                                                    e.out_time?.slice(0, 5)
                                                )}
                                            </td>
                                            <td className="font-bold text-accent">
                                                {isEditMode && e.status === 'pending' ? (
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={e.hours || 0}
                                                        onChange={e2 => onLocalChange(e.id, 'hours', e2.target.value)}
                                                        className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-16 text-center font-bold focus:border-primary text-accent"
                                                    />
                                                ) : (
                                                    Number(e.hours).toFixed(2)
                                                )}
                                            </td>
                                            <td>
                                                <span className="status-pill inline-flex items-center gap-1" style={{ background: s.bg, color: s.color }}>
                                                    {s.icon} {s.label}
                                                </span>
                                            </td>
                                            <td className="text-secondary text-xs">
                                                <div className="flex items-center gap-2">
                                                    {e.status === 'pending' && !isEditMode && (
                                                        <button
                                                            onClick={() => handleQuickApprove(e.id)}
                                                            className="btn btn-secondary text-[10px] py-1 px-2 uppercase font-bold"
                                                            disabled={loading}
                                                        >
                                                            ✅ Approve
                                                        </button>
                                                    )}
                                                    <span className="max-w-[100px] truncate">{e.admin_note || '—'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
