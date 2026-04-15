"use client";

import { useState } from "react";
import Link from "next/link";

export default function StudentDirectory({ students, user }) {
    const [query, setQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [courseFilter, setCourseFilter] = useState("");
    const [batchFilter, setBatchFilter] = useState("");

    const groups = Array.from(new Set(students.map(s => s.group_name).filter(Boolean)));
    const courses = Array.from(new Set(students.map(s => s.course).filter(Boolean)));
    const batches = Array.from(new Set(students.map(s => s.batch).filter(Boolean)));

    const filtered = students.filter(s => {
        const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.student_id.toLowerCase().includes(query.toLowerCase());
        const matchesGroup = !groupFilter || s.group_name === groupFilter;
        const matchesCourse = !courseFilter || s.course === courseFilter;
        const matchesBatch = !batchFilter || s.batch === batchFilter;

        return matchesQuery && matchesGroup && matchesCourse && matchesBatch;
    });

    return (
        <div className="glass-card">
            <div className="mb-4">
                <div className="d-flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Student Directory</h3>
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ maxWidth: '300px', padding: '0.6rem 1rem' }}
                    />
                </div>

                <div className="grid grid-cols-3 gap-1" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Filter by Group</label>
                        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ padding: '0.4rem' }}>
                            <option value="">All Groups</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Filter by Course</label>
                        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ padding: '0.4rem' }}>
                            <option value="">All Courses</option>
                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Filter by Batch</label>
                        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} style={{ padding: '0.4rem' }}>
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Group</th>
                            <th>Course & Batch</th>
                            <th>Avg Rating</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => (
                            <tr key={s._id}>
                                <td>
                                    {s.photo_url ? <img src={s.photo_url} alt="profile" className="avatar" /> : <div className="avatar d-flex items-center justify-center" style={{ background: '#334155' }}><span style={{ fontSize: '10px' }}>N/A</span></div>}
                                </td>
                                <td style={{ fontWeight: '500' }}>{s.student_id}</td>
                                <td>{s.name}</td>
                                <td><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>{s.group_name || 'No Group'}</span></td>
                                <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{s.course}</span> {s.batch}</td>
                                <td>{s.avgRating !== 'N/A' ? <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>⭐ {s.avgRating} ({s.feedbackCount})</span> : <span style={{ color: 'var(--text-secondary)' }}>No review</span>}</td>
                                <td>
                                    <div className="d-flex gap-1">
                                        <Link href={`/students/${s._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Profile</Link>
                                        {user?.role === 'admin' && (
                                            <Link href={`/students/${s._id}/edit`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>Edit</Link>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan="6" className="text-center" style={{ padding: '2rem' }}>No matching students found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
