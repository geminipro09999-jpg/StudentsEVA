"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_TABS = [
    { key: "active", label: "🟢 Active" },
    { key: "all", label: "All Students" },
    { key: "discontinued", label: "🔴 Discontinued" },
];

export default function StudentDirectory({ students, user }) {
    const [query, setQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [courseFilter, setCourseFilter] = useState("");
    const [batchFilter, setBatchFilter] = useState("");
    const [statusTab, setStatusTab] = useState("active");

    const groups = Array.from(new Set(students.map(s => s.group_name).filter(Boolean)));
    const courses = Array.from(new Set(students.map(s => s.course).filter(Boolean)));
    const batches = Array.from(new Set(students.map(s => s.batch).filter(Boolean)));

    const activeCount = students.filter(s => (s.status || 'active') === 'active').length;
    const discontinuedCount = students.filter(s => s.status === 'discontinued').length;

    const filtered = students.filter(s => {
        const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.student_id.toLowerCase().includes(query.toLowerCase());
        const matchesGroup = !groupFilter || s.group_name === groupFilter;
        const matchesCourse = !courseFilter || s.course === courseFilter;
        const matchesBatch = !batchFilter || s.batch === batchFilter;
        const studentStatus = s.status || 'active';
        const matchesStatus =
            statusTab === "all" ||
            (statusTab === "active" && studentStatus === "active") ||
            (statusTab === "discontinued" && studentStatus === "discontinued");

        return matchesQuery && matchesGroup && matchesCourse && matchesBatch && matchesStatus;
    });

    return (
        <div className="card">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-6 wrap gap-4">
                    <div>
                        <h3 className="text-2xl font-bold m-0">Student Directory</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            <span style={{ color: '#10b981', fontWeight: '600' }}>{activeCount} Active</span>
                            <span style={{ color: 'var(--text-secondary)', margin: '0 0.4rem' }}>·</span>
                            <span style={{ color: '#ef4444', fontWeight: '600' }}>{discontinuedCount} Discontinued</span>
                        </p>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="max-w-xs"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex gap-2 mb-4">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusTab(tab.key)}
                            className="btn"
                            style={{
                                padding: '0.4rem 1rem',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                background: statusTab === tab.key ? 'var(--accent-color)' : 'transparent',
                                color: statusTab === tab.key ? '#fff' : 'var(--text-secondary)',
                                border: `1px solid ${statusTab === tab.key ? 'var(--accent-color)' : 'var(--card-border)'}`,
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                    {user?.role === 'admin' && (
                        <Link
                            href="/students/discontinued"
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '600', marginLeft: 'auto' }}
                        >
                            📋 Discontinued Report
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <div>
                        <label className="text-xs text-secondary mb-1">Filter by Group</label>
                        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full">
                            <option value="">All Groups</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-secondary mb-1">Filter by Course</label>
                        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-full">
                            <option value="">All Courses</option>
                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-secondary mb-1">Filter by Batch</label>
                        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="w-full">
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Group</th>
                            <th>Course &amp; Batch</th>
                            <th>Avg Rating</th>
                            <th className="text-right px-6">Operations</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => {
                            const isDiscontinued = s.status === 'discontinued';
                            return (
                                <tr key={s._id} style={{ opacity: isDiscontinued ? 0.7 : 1 }}>
                                    <td>
                                        {s.photo_url ? (
                                            <img src={s.photo_url} alt="profile" style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--card-border)', boxShadow: '0 0 10px rgba(99,102,241,0.12)' }} />
                                        ) : (
                                            <div style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.85rem', color: 'var(--accent-color)', border: '2px solid var(--card-border)' }}>
                                                N/A
                                            </div>
                                        )}
                                    </td>
                                    <td className="font-semibold">{s.student_id}</td>
                                    <td className="font-medium text-primary">{s.name}</td>
                                    <td>
                                        {isDiscontinued ? (
                                            <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>
                                                🔴 Discontinued
                                            </span>
                                        ) : (
                                            <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>
                                                🟢 Active
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                                            {s.group_name || 'No Group'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                                            {s.course}
                                        </span>
                                        <span className="text-sm text-secondary ml-2">{s.batch}</span>
                                    </td>
                                    <td>
                                        {s.avgRating !== 'N/A' ? (
                                            <span className="text-warning font-bold">⭐ {s.avgRating} <span className="text-secondary font-medium text-sm">({s.feedbackCount})</span></span>
                                        ) : (
                                            <span className="text-secondary text-sm">No review</span>
                                        )}
                                    </td>
                                    <td className="text-right px-6">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/students/${s._id}`} className="btn btn-secondary px-3 py-1.5 text-xs">
                                                Profile
                                            </Link>
                                            {user?.role === 'admin' && (
                                                <Link href={`/students/${s._id}/edit`} className="btn btn-primary px-4 py-2 text-sm" style={{ background: 'var(--accent-color)', color: '#0b1326', boxShadow: '0 4px 12px var(--accent-glow)' }}>
                                                    Edit
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan="8" className="text-center p-8 text-secondary">No matching students found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
