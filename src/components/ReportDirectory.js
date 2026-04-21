"use client";

import { useState } from "react";

export default function ReportDirectory({ feedbacks, allSubjects = [], allLabs = [] }) {
    const [utQuery, setUtQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [labFilter, setLabFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");
    const [lecturerFilter, setLecturerFilter] = useState("");
    const [ratingFilter, setRatingFilter] = useState("");

    const groups = Array.from(new Set(feedbacks.map(f => f.group_name).filter(g => g !== 'N/A')));

    const dbLabs = allLabs.map(l => l.name);
    const extractedLabs = feedbacks.map(f => f.lab_activity).filter(l => l !== 'Manual/Other');
    const labs = Array.from(new Set([...dbLabs, ...extractedLabs]));

    const dbSubjects = allSubjects.map(s => s.name);
    const extractedSubjects = feedbacks.map(f => f.subject).filter(s => s !== undefined);
    const subjects = Array.from(new Set([...dbSubjects, ...extractedSubjects]));

    const lecturers = Array.from(new Set(feedbacks.map(f => f.lecturer).filter(l => l !== 'N/A')));

    // Enforcing strict order instead of DB-insertion order
    const orderedLabels = ["Bad", "Average", "Good", "Very Good", "Excellent"];
    const ratings = Array.from(new Set(feedbacks.map(f => f.rating))).sort((a, b) => {
        return orderedLabels.indexOf(a) - orderedLabels.indexOf(b);
    });

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
        <div className="glass-card">
            <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">UT Number Search</label>
                        <input
                            type="text"
                            placeholder="e.g. UT001"
                            value={utQuery}
                            onChange={e => setUtQuery(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">Group</label>
                        <select
                            value={groupFilter}
                            onChange={e => setGroupFilter(e.target.value)}
                        >
                            <option value="">All Groups</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">Subject</label>
                        <select
                            value={subjectFilter}
                            onChange={e => setSubjectFilter(e.target.value)}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s} value={s}>{s === 'General' ? 'General' : s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">Lab Activity</label>
                        <select
                            value={labFilter}
                            onChange={e => setLabFilter(e.target.value)}
                        >
                            <option value="">All Labs</option>
                            {labs.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">Rating</label>
                        <select
                            value={ratingFilter}
                            onChange={e => setRatingFilter(e.target.value)}
                        >
                            <option value="">All Ratings</option>
                            {ratings.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">Lecturer</label>
                        <select
                            value={lecturerFilter}
                            onChange={e => setLecturerFilter(e.target.value)}
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
                                <td className="text-xs text-secondary">{f.date}</td>
                                <td className="font-bold text-sm tracking-tight">{f.ut_number}</td>
                                <td className="text-primary font-bold">{f.student_name}</td>
                                <td><span className="badge border-accent/20 bg-accent/5 text-accent">{f.group_name}</span></td>
                                <td className="text-xs font-medium text-secondary/80">{f.subject}</td>
                                <td className="text-xs font-medium text-secondary/80">{f.lab_activity}</td>
                                <td className="font-black text-warning tracking-tighter">{f.rating}</td>
                                <td className="text-xs text-secondary italic max-w-xs truncate" title={f.remark}>"{f.remark}"</td>
                                <td className="text-xs font-bold text-accent-light">{f.lecturer}</td>
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
