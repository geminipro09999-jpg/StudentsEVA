"use client";

import { useState } from "react";
import Link from "next/link";

export default function StudentDirectory({ students }) {
    const [query, setQuery] = useState("");

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.student_id.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="glass-card">
            <div className="d-flex justify-between items-center mb-2" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Student Directory</h3>
                <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ maxWidth: '300px', padding: '0.6rem 1rem' }}
                />
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>ID</th>
                            <th>Name</th>
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
                                <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{s.course}</span> {s.batch}</td>
                                <td>{s.avgRating !== 'N/A' ? <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>⭐ {s.avgRating} ({s.feedbackCount})</span> : <span style={{ color: 'var(--text-secondary)' }}>No review</span>}</td>
                                <td>
                                    <Link href={`/students/${s._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Profile</Link>
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
