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

    const lecturerMap = useMemo(() => {
        const m = {};
        (lecturers || []).forEach(l => { m[l.id] = l.name; });
        return m;
    }, [lecturers]);

    const filtered = useMemo(() => {
        return (entries || []).filter(e => {
            if (filterLecturer && e.lecturer_id !== filterLecturer) return false;
            if (filterStatus && e.status !== filterStatus) return false;
            return true;
        });
    }, [entries, filterLecturer, filterStatus]);

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
    const pendingCount = (entries || []).filter(e => e.status === 'pending').length;
    const approvedHours = (entries || []).filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.hours), 0);

    return (
        <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Pending Review', value: pendingCount, icon: '🟡', color: '#fbbf24' },
                    { label: 'Total Approved Hours', value: approvedHours.toFixed(1) + 'h', icon: '✅', color: '#34d399' },
                    { label: 'Total Entries', value: (entries || []).length, icon: '📋', color: 'var(--accent-color)' },
                ].map(c => (
                    <div key={c.label} className="glass-card text-center" style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem' }}>{c.icon}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card mb-4" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label>Lecturer</label>
                        <select value={filterLecturer} onChange={e => setFilterLecturer(e.target.value)} className="input" style={{ width: '100%' }}>
                            <option value="">All Lecturers</option>
                            {(lecturers || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input" style={{ width: '100%' }}>
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label>Admin Note (for selected)</label>
                        <input type="text" placeholder="Optional note..." value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {selected.size > 0 && (
                <div className="flex gap-3 mb-4 items-center wrap">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selected.size} selected</span>
                    <button onClick={() => handleAction('approved')} className="btn btn-primary" disabled={loading} style={{ fontSize: '0.85rem' }}>
                        ✅ Approve Selected
                    </button>
                    <button onClick={() => handleAction('rejected')} className="btn btn-danger" disabled={loading} style={{ fontSize: '0.85rem' }}>
                        ❌ Reject Selected
                    </button>
                </div>
            )}

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                    <p>No entries matching the filters.</p>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead style={{ background: 'rgba(99,102,241,0.04)' }}>
                                <tr>
                                    <th style={{ padding: '0.8rem 1rem', textAlign: 'center', width: '40px' }}>
                                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                                    </th>
                                    {['Lecturer', 'Date', 'In', 'Out', 'Hours', 'Status', 'Note'].map(h => (
                                        <th key={h} style={{ padding: '0.8rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(e => {
                                    const s = STATUS_MAP[e.status] || STATUS_MAP.pending;
                                    return (
                                        <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                                                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem', fontWeight: '500' }}>{lecturerMap[e.lecturer_id] || 'Unknown'}</td>
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                {new Date(e.work_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem' }}>{e.in_time?.slice(0, 5)}</td>
                                            <td style={{ padding: '0.7rem 1rem' }}>{e.out_time?.slice(0, 5)}</td>
                                            <td style={{ padding: '0.7rem 1rem', fontWeight: '700', color: 'var(--accent-color)' }}>{Number(e.hours).toFixed(2)}</td>
                                            <td style={{ padding: '0.7rem 1rem' }}>
                                                <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                    {s.icon} {s.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.7rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{e.admin_note || '—'}</td>
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
