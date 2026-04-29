"use client";

import { useState } from "react";
import Link from "next/link";
import { getAllScoresForViva } from "@/app/actions/scoringActions";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ReportDirectory({ feedbacks, vivas = [], quizzes = [], allSubjects = [], allLabs = [] }) {
    const [activeTab, setActiveTab] = useState("feedbacks");
    const [utQuery, setUtQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [labFilter, setLabFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");
    const [lecturerFilter, setLecturerFilter] = useState("");
    const [ratingFilter, setRatingFilter] = useState("");
    const [quizNameFilter, setQuizNameFilter] = useState("");
    const [exporting, setExporting] = useState(false);

    // Helpers
    const groups = Array.from(new Set(feedbacks.map(f => f.group_name).filter(g => g !== 'N/A')));
    const quizNames = Array.from(new Set(quizzes.map(q => q.quiz_name)));
    const dbLabs = allLabs.map(l => l.name);
    const extractedLabs = feedbacks.map(f => f.lab_activity).filter(l => l !== 'Manual/Other');
    const labs = Array.from(new Set([...dbLabs, ...extractedLabs]));
    const dbSubjects = allSubjects.map(s => s.name);
    const extractedSubjects = feedbacks.map(f => f.subject).filter(s => s !== undefined);
    const subjects = Array.from(new Set([...dbSubjects, ...extractedSubjects]));
    const lecturers = Array.from(new Set(feedbacks.map(f => f.lecturer).filter(l => l !== 'N/A')));
    const orderedLabels = ["Bad", "Average", "Good", "Very Good", "Excellent"];
    const ratings = Array.from(new Set(feedbacks.map(f => f.rating))).sort((a, b) => {
        return orderedLabels.indexOf(a) - orderedLabels.indexOf(b);
    });

    // Feedback Filtering
    const filteredFeedbacks = feedbacks.filter(f => {
        const matchesUt = utQuery === "" || f.ut_number.toLowerCase().includes(utQuery.toLowerCase());
        const matchesGroup = groupFilter === "" || f.group_name === groupFilter;
        const matchesLab = labFilter === "" || f.lab_activity === labFilter;
        const matchesSubject = subjectFilter === "" || f.subject === subjectFilter;
        const matchesLecturer = lecturerFilter === "" || f.lecturer === lecturerFilter;
        const matchesRating = ratingFilter === "" || f.rating === ratingFilter;
        return matchesUt && matchesGroup && matchesLab && matchesSubject && matchesLecturer && matchesRating;
    });

    // Viva Filtering
    const filteredVivas = vivas.filter(v => 
        v.name.toLowerCase().includes(utQuery.toLowerCase())
    );

    // Quiz Filtering
    const filteredQuizzes = quizzes.filter(q => {
        const matchesUt = utQuery === "" || 
            q.students?.student_id.toLowerCase().includes(utQuery.toLowerCase()) ||
            q.students?.name.toLowerCase().includes(utQuery.toLowerCase());
        const matchesGroup = groupFilter === "" || q.students?.group_name === groupFilter;
        const matchesQuizName = quizNameFilter === "" || q.quiz_name === quizNameFilter;
        return matchesUt && matchesGroup && matchesQuizName;
    });

    const handleExportViva = async (viva) => {
        setExporting(viva.id);
        const res = await getAllScoresForViva(viva.id);
        if (res.data) {
            // Group scores logic
            let grouped = res.data.reduce((acc, score) => {
                const key = `${score.student_id}_${score.lecturer_id}`;
                if (!acc[key]) {
                    acc[key] = {
                        student: score.students,
                        lecturer: score.users,
                        criteriaScores: {},
                        remark: score.remark,
                        total: 0,
                        max_total: 0
                    };
                }
                acc[key].criteriaScores[score.criteria_id] = score.score;
                acc[key].total += score.score;
                acc[key].max_total += score.viva_criteria.max_marks;
                return acc;
            }, {});

            // Filter by group if active
            if (groupFilter) {
                grouped = Object.fromEntries(
                    Object.entries(grouped).filter(([_, g]) => g.student.group_name === groupFilter)
                );
            }

            // Generate PDF
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text("Viva Evaluation Report", 14, 22);
            if (groupFilter) {
                doc.setFontSize(14);
                doc.setTextColor(66, 133, 244);
                doc.text(`Group: ${groupFilter}`, 14, 30);
            }
            
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Event: ${viva.name}`, 14, 40);
            doc.text(`Date: ${new Date(viva.viva_date).toLocaleDateString()}`, 14, 47);

            const tableColumn = ["Student", "UT Number", "Lecturer", "Total", "Remark"];
            const tableRows = Object.values(grouped).map(g => [
                g.student.name,
                g.student.student_id,
                g.lecturer.name,
                `${g.total} / ${g.max_total}`,
                g.remark || "-"
            ]);

            doc.autoTable({
                startY: 55,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid'
            });

            const groupSuffix = groupFilter ? `_${groupFilter}` : "";
            doc.save(`Report_${viva.name}${groupSuffix}.pdf`);
        }
        setExporting(false);
    };

    return (
        <div className="glass-card">
            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 border-b border-card-border pb-4">
                <button 
                    onClick={() => setActiveTab("feedbacks")}
                    className={`btn ${activeTab === "feedbacks" ? "btn-primary" : "btn-secondary"} py-2 px-6 rounded-xl`}
                >
                    💬 Feedback Reports
                </button>
                <button 
                    onClick={() => setActiveTab("vivas")}
                    className={`btn ${activeTab === "vivas" ? "btn-primary" : "btn-secondary"} py-2 px-6 rounded-xl`}
                >
                    🎤 Viva Reports
                </button>
                <button 
                    onClick={() => setActiveTab("quizzes")}
                    className={`btn ${activeTab === "quizzes" ? "btn-primary" : "btn-secondary"} py-2 px-6 rounded-xl`}
                >
                    📝 Quiz Reports
                </button>
            </div>

            <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">
                            {activeTab === "vivas" ? "Search Viva Name" : "UT Number Search"}
                        </label>
                        <input
                            type="text"
                            placeholder={activeTab === "vivas" ? "Search event..." : "e.g. UT001"}
                            value={utQuery}
                            onChange={e => setUtQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">Group</label>
                        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
                            <option value="">All Groups</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {activeTab === "quizzes" && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary uppercase tracking-widest">Quiz Name</label>
                            <select value={quizNameFilter} onChange={e => setQuizNameFilter(e.target.value)}>
                                <option value="">All Quizzes</option>
                                {quizNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                    )}

                    {activeTab === "feedbacks" && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-secondary uppercase tracking-widest">Subject</label>
                                <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                                    <option value="">All Subjects</option>
                                    {subjects.map(s => <option key={s} value={s}>{s === 'General' ? 'General' : s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-secondary uppercase tracking-widest">Rating</label>
                                <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
                                    <option value="">All Ratings</option>
                                    {ratings.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {activeTab === "feedbacks" && (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>UT Number</th>
                                <th>Student Name</th>
                                <th>Group</th>
                                <th>Subject</th>
                                <th>Rating</th>
                                <th>Remark</th>
                                <th>Lecturer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.map(f => (
                                <tr key={f.id}>
                                    <td className="text-xs text-secondary">{f.date}</td>
                                    <td className="font-bold text-sm tracking-tight">{f.ut_number}</td>
                                    <td className="text-primary font-bold">{f.student_name}</td>
                                    <td><span className="badge border-accent/20 bg-accent/5 text-accent">{f.group_name}</span></td>
                                    <td className="text-xs font-medium text-secondary/80">{f.subject}</td>
                                    <td className="font-black text-warning tracking-tighter">{f.rating}</td>
                                    <td className="text-xs text-secondary italic max-w-xs truncate" title={f.remark}>"{f.remark}"</td>
                                    <td className="text-xs font-bold text-accent-light">{f.lecturer}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "vivas" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVivas.map(viva => (
                        <div key={viva.id} className="card p-6 border-accent/10 hover:border-accent/40 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-color px-2 py-1 bg-accent/5 rounded-lg border border-accent/10">Viva Session</span>
                                <span className="text-xs font-medium text-secondary bg-surface-container px-3 py-1 rounded-full">{new Date(viva.viva_date).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-xl font-bold mb-4">{viva.name}</h4>
                            <div className="flex gap-2">
                                <Link href={`/vivas/${viva.id}`} className="btn btn-secondary flex-1 py-2 text-xs">Manage</Link>
                                <button 
                                    onClick={() => handleExportViva(viva)}
                                    disabled={exporting === viva.id}
                                    className="btn btn-primary flex-1 py-2 text-xs"
                                >
                                    {exporting === viva.id ? "Exporting..." : "Export PDF"}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredVivas.length === 0 && <p className="col-span-full text-center py-12 text-secondary">No viva events found.</p>}
                </div>
            )}

            {activeTab === "quizzes" && (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>UT Number</th>
                                <th>Student Name</th>
                                <th>Group</th>
                                <th>Quiz Name</th>
                                <th>Marks</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuizzes.map(q => (
                                <tr key={q.id}>
                                    <td className="text-xs text-secondary">{new Date(q.created_at).toLocaleDateString()}</td>
                                    <td className="font-bold text-sm">{q.students?.student_id}</td>
                                    <td className="text-primary font-bold">{q.students?.name}</td>
                                    <td><span className="badge bg-surface-container text-secondary text-[10px]">{q.students?.group_name}</span></td>
                                    <td className="text-xs text-secondary">{q.quiz_name}</td>
                                    <td className="font-bold text-accent-color">{q.marks} / {q.total_marks}</td>
                                    <td>
                                        <span className={`badge ${((q.marks/q.total_marks)*100) >= 50 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                            {((q.marks / q.total_marks) * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredQuizzes.length === 0 && <tr><td colSpan="6" className="text-center p-8 text-secondary">No quiz marks recorded.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
