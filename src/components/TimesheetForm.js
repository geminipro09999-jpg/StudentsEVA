"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";

const STATUS_MAP = {
    pending: { label: 'Pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: '🟡' },
    approved: { label: 'Approved', color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: '✅' },
    rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: '❌' },
};

export default function TimesheetForm({ entries, lecturerName }) {
    const [workDate, setWorkDate] = useState('');
    const [inTime, setInTime] = useState('');
    const [outTime, setOutTime] = useState('');
    const [loading, setLoading] = useState(false);

    const calculatedHours = useMemo(() => {
        if (!inTime || !outTime) return null;
        const [ih, im] = inTime.split(':').map(Number);
        const [oh, om] = outTime.split(':').map(Number);

        let diff = (oh + om / 60) - (ih + im / 60);
        if (diff <= 0) diff += 24; // Handle overnight or 0-duration

        return (Math.round(diff * 100) / 100).toFixed(2);
    }, [inTime, outTime]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!calculatedHours) {
            toast.error("Out time must be after In time");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/timesheet/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ work_date: workDate, in_time: inTime, out_time: outTime }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to submit');
            } else {
                toast.success(`✅ Timesheet submitted — ${data.hours} hours`);
                setWorkDate('');
                setInTime('');
                setOutTime('');
                window.location.reload();
            }
        } catch {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {/* Submit Form */}
            <div className="glass-card mb-6">
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1.25rem' }}>➕ Log Work Hours</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label>Date</label>
                            <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} required />
                        </div>
                        <div>
                            <label>In Time</label>
                            <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} required />
                        </div>
                        <div>
                            <label>Out Time</label>
                            <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} required />
                        </div>
                        <div>
                            <label>Hours</label>
                            <div style={{
                                padding: '0.7rem 1rem',
                                background: calculatedHours ? 'rgba(52,211,153,0.08)' : 'var(--card-bg-solid)',
                                border: '1px solid var(--card-border)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '700',
                                fontSize: '1.1rem',
                                color: calculatedHours ? 'var(--success)' : 'var(--text-tertiary)',
                                textAlign: 'center',
                            }}>
                                {calculatedHours ? `${calculatedHours} hrs` : '—'}
                            </div>
                        </div>
                        <div>
                            <button type="submit" className="btn btn-primary w-full" disabled={loading || !calculatedHours}>
                                {loading ? '⏳ Submitting...' : '📤 Submit'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Workflow Tip */}
            <div className="glass-card mb-4 p-4" style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">📌 How the Invoice Flow Works</p>
                <div className="flex gap-6 flex-wrap text-sm">
                    <span><strong>1.</strong> Log hours below (daily)</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                    <span><strong>2.</strong> At end of month — click <em>"Submit Monthly Invoice"</em></span>
                    <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                    <span><strong>3.</strong> Admin reviews &amp; approves → you download your invoice</span>
                </div>
            </div>

            {/* History */}
            <div className="glass-card">
                <div className="flex justify-between items-center mb-4">
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>📋 My Timesheet History</h3>
                    <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>{(entries || []).length} Entries</span>
                </div>

                {(!entries || entries.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                        <p>No timesheet entries yet. Log your first work hours above.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    {['Date', 'In Time', 'Out Time', 'Hours', 'Status', 'Admin Note'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(e => {
                                    const s = STATUS_MAP[e.status] || STATUS_MAP.pending;
                                    return (
                                        <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                                                {new Date(e.work_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{e.in_time?.slice(0, 5)}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{e.out_time?.slice(0, 5)}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--accent-color)' }}>{Number(e.hours).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                    {s.icon} {s.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '200px' }}>{e.admin_note || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
