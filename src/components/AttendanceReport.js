"use client";

import { useState, useMemo } from "react";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceReport({ records, students }) {
    const currentDate = new Date();
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(String(currentDate.getFullYear()));
    const [filterGroup, setFilterGroup] = useState('');
    const [search, setSearch] = useState('');

    // Build student lookup map
    const studentMap = useMemo(() => {
        const map = {};
        (students || []).forEach(s => { map[s.student_id] = s; });
        return map;
    }, [students]);

    // Get unique available years and groups
    const availableYears = useMemo(() => {
        const years = [...new Set((records || []).map(r => r.year))].sort((a, b) => b - a);
        return years;
    }, [records]);

    const availableGroups = useMemo(() => {
        const groups = [...new Set((students || []).map(s => s.group_name).filter(Boolean))].sort();
        return groups;
    }, [students]);

    // Filtered records
    const filtered = useMemo(() => {
        return (records || []).filter(r => {
            const student = studentMap[r.student_id];
            if (filterMonth && r.month !== Number(filterMonth)) return false;
            if (filterYear && r.year !== Number(filterYear)) return false;
            if (filterGroup && student?.group_name !== filterGroup) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    r.student_id.toLowerCase().includes(q) ||
                    (student?.name || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [records, filterMonth, filterYear, filterGroup, search, studentMap]);

    // Summary stats
    const stats = useMemo(() => {
        if (filtered.length === 0) return null;
        const avgPct = filtered.reduce((acc, r) => acc + (r.present_days / r.total_days) * 100, 0) / filtered.length;
        const atRisk = filtered.filter(r => (r.present_days / r.total_days) * 100 < 75).length;
        return { total: filtered.length, avgPct: avgPct.toFixed(1), atRisk };
    }, [filtered]);

    return (
        <div>
            {/* Filters */}
            <div className="glass-card mb-4" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Search</label>
                        <input
                            type="text"
                            placeholder="UT number or name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Month</label>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input" style={{ width: '100%' }}>
                            <option value="">All Months</option>
                            {MONTH_NAMES.slice(1).map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Year</label>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input" style={{ width: '100%' }}>
                            <option value="">All Years</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Group</label>
                        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input" style={{ width: '100%' }}>
                            <option value="">All Groups</option>
                            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <button onClick={() => { setFilterMonth(''); setFilterYear(String(currentDate.getFullYear())); setFilterGroup(''); setSearch(''); }}
                            className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total Students', value: stats.total, icon: '👥', color: 'var(--accent-color)' },
                        { label: 'Avg Attendance', value: `${stats.avgPct}%`, icon: '📈', color: '#10b981' },
                        { label: 'At Risk (<75%)', value: stats.atRisk, icon: '⚠️', color: '#ef4444' },
                    ].map(card => (
                        <div key={card.label} className="glass-card text-center" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '1.8rem' }}>{card.icon}</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{card.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <p>No attendance records found for the selected filters.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Upload attendance data from the <strong>Upload Attendance</strong> tab.</p>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <tr>
                                    {['UT Number', 'Student Name', 'Group', 'Month', 'Year', 'Present', 'Total', 'Attendance %', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r) => {
                                    const student = studentMap[r.student_id];
                                    const pct = r.total_days > 0 ? ((r.present_days / r.total_days) * 100) : 0;
                                    const pctStr = pct.toFixed(1);
                                    const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                    const statusLabel = pct >= 75 ? 'Good' : pct >= 50 ? 'Average' : 'At Risk';
                                    return (
                                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>{r.student_id}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{student?.name || '—'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>{student?.group_name || '—'}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{MONTH_NAMES[r.month]}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{r.year}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{r.present_days}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{r.total_days}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', minWidth: '60px' }}>
                                                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontWeight: '600', color, minWidth: '45px' }}>{pctStr}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ background: `${color}22`, color, padding: '2px 10px', borderRadius: '999px', fontWeight: '600', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{statusLabel}</span>
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
