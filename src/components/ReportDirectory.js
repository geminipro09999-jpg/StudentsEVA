"use client";

import { useState } from "react";

export default function ReportDirectory({ feedbacks }) {
    const [utQuery, setUtQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [labFilter, setLabFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");
    const [lecturerFilter, setLecturerFilter] = useState("");
    const [ratingFilter, setRatingFilter] = useState("");

    const groups = Array.from(new Set(feedbacks.map(f => f.group_name).filter(g => g !== 'N/A')));
    const labs = Array.from(new Set(feedbacks.map(f => f.lab_activity).filter(l => l !== 'Manual/Other')));
    const subjects = Array.from(new Set(feedbacks.map(f => f.subject).filter(s => s !== undefined)));
    const lecturers = Array.from(new Set(feedbacks.map(f => f.lecturer).filter(l => l !== 'N/A')));
    const ratings = Array.from(new Set(feedbacks.map(f => f.rating)));

    const filtered = feedbacks.filter(f => {
        const matchesUt = utQuery === "" || f.ut_number.toLowerCase().includes(utQuery.toLowerCase());
        const matchesGroup = groupFilter === "" || f.group_name === groupFilter;
        const matchesLab = labFilter === "" || f.lab_activity === labFilter;
        const matchesSubject = subjectFilter === "" || f.subject === subjectFilter;
        const matchesLecturer = lecturerFilter === "" || f.lecturer === lecturerFilter;
        const matchesRating = ratingFilter === "" || f.rating === ratingFilter;

        return matchesUt && matchesGroup && matchesLab && matchesSubject && matchesLecturer && matchesRating;
    });

    return (
        <div className="card">
            <div className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="text-sm font-semibold mb-1 block">UT Number Search</label>
                        <input
                            type="text"
                            placeholder="e.g. UT001"
                            value={utQuery}
                            onChange={e => setUtQuery(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold mb-1 block">Group</label>
                        <select
                            value={groupFilter}
                            onChange={e => setGroupFilter(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Groups</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold mb-1 block">Subject</label>
                        <select
                            value={subjectFilter}
                            onChange={e => setSubjectFilter(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s} value={s}>{s === 'General' ? 'General' : s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold mb-1 block">Lab Activity</label>
                        <select
                            value={labFilter}
                            onChange={e => setLabFilter(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Labs</option>
                            {labs.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold mb-1 block">Rating</label>
                        <select
                            value={ratingFilter}
                            onChange={e => setRatingFilter(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Ratings</option>
                            {ratings.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold mb-1 block">Lecturer</label>
                        <select
                            value={lecturerFilter}
                            onChange={e => setLecturerFilter(e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                            style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                        >
                            <option value="">All Lecturers</option>
                            {lecturers.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>UT Number</th>
                            <th>Student Name</th>
                            <th>Group</th>
                            <th>Subject</th>
                            <th>Lab Activity</th>
                            <th>Rating</th>
                            <th>Remark</th>
                            <th>Lecturer</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(f => (
                            <tr key={f.id}>
                                <td className="text-sm text-secondary">{f.date}</td>
                                <td className="font-semibold text-sm">{f.ut_number}</td>
                                <td className="text-primary font-medium text-sm">{f.student_name}</td>
                                <td className="text-sm"><span className="badge" style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)' }}>{f.group_name}</span></td>
                                <td className="text-sm text-secondary font-medium">{f.subject}</td>
                                <td className="text-sm text-secondary">{f.lab_activity}</td>
                                <td className="text-sm text-warning font-bold">{f.rating}</td>
                                <td className="text-sm max-w-xs truncate" title={f.remark}>{f.remark}</td>
                                <td className="text-sm">{f.lecturer}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan="9" className="text-center p-8 text-secondary">No matching feedback entries found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
