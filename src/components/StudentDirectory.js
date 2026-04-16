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
        <div className="card">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-6 wrap gap-4">
                    <h3 className="text-2xl font-bold m-0">Student Directory</h3>
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="max-w-xs"
                    />
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
                                    {s.photo_url ? (
                                        <img src={s.photo_url} alt="profile" className="avatar" />
                                    ) : (
                                        <div className="avatar flex items-center justify-center font-bold text-xs" style={{ background: 'var(--bg-color)' }}>
                                            N/A
                                        </div>
                                    )}
                                </td>
                                <td className="font-semibold">{s.student_id}</td>
                                <td className="font-medium text-primary">{s.name}</td>
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
                                <td>
                                    <div className="flex gap-2">
                                        <Link href={`/students/${s._id}`} className="btn btn-secondary px-4 py-2 text-sm">
                                            Profile
                                        </Link>
                                        {user?.role === 'admin' && (
                                            <Link href={`/students/${s._id}/edit`} className="btn btn-primary px-4 py-2 text-sm" style={{ background: 'transparent', color: 'var(--accent-color)', border: '1px solid var(--accent-hover)' }}>
                                                Edit
                                            </Link>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan="7" className="text-center p-8 text-secondary">No matching students found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
