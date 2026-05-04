"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getAllScoresForViva } from "@/app/actions/scoringActions";
import { getVivaDetails } from "@/app/actions/vivaActions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExportVivaReport from "@/components/ExportVivaReport";

export default function ReportDirectory({ feedbacks, vivas = [], vivaScores = [], quizzes = [], allSubjects = [], allLabs = [] }) {
    const [activeTab, setActiveTab] = useState("feedbacks");
    const [utQuery, setUtQuery] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [labFilter, setLabFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");
    const [lecturerFilter, setLecturerFilter] = useState("");
    const [ratingFilter, setRatingFilter] = useState("");
    const [quizNameFilter, setQuizNameFilter] = useState("");
    const [exporting, setExporting] = useState(false);
    
    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    
    // Viva Ledger State
    const [selectedVivaId, setSelectedVivaId] = useState("");
    const [selectedVivaDetails, setSelectedVivaDetails] = useState(null);
    const [selectedVivaGroupedScores, setSelectedVivaGroupedScores] = useState([]);
    const [isLoadingViva, setIsLoadingViva] = useState(false);

    // Extract unique students for autocomplete
    const uniqueStudents = useMemo(() => {
        const map = new Map();
        feedbacks.forEach(f => {
            if (f.student?.student_id) map.set(f.student.student_id, f.student.name);
        });
        vivaScores.forEach(v => {
            if (v.students?.student_id) map.set(v.students.student_id, v.students.name);
        });
        quizzes.forEach(q => {
            if (q.students?.student_id) map.set(q.students.student_id, q.students.name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [feedbacks, vivaScores, quizzes]);

    const searchSuggestions = useMemo(() => {
        if (!utQuery || utQuery.length < 1) return [];
        const query = utQuery.toLowerCase();
        return uniqueStudents.filter(s => 
            s.id.toLowerCase().includes(query) || 
            (s.name && s.name.toLowerCase().includes(query))
        ).slice(0, 8); // Max 8 suggestions
    }, [utQuery, uniqueStudents]);

    // Reset pagination on filter or tab change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, utQuery, groupFilter, labFilter, subjectFilter, lecturerFilter, ratingFilter, quizNameFilter, itemsPerPage, selectedVivaId]);

    // Fetch and calculate Grouped Scores when a Viva is selected
    useEffect(() => {
        if (!selectedVivaId) {
            setSelectedVivaDetails(null);
            setSelectedVivaGroupedScores([]);
            return;
        }

        async function fetchVivaLedger() {
            setIsLoadingViva(true);
            const [{ data: viva }, { data: scores }] = await Promise.all([
                getVivaDetails(selectedVivaId),
                getAllScoresForViva(selectedVivaId)
            ]);

            if (viva && scores) {
                const vivaTotal = viva.criteria.reduce((s, c) => s + c.max_marks, 0);
                const panelistWeights = viva.panelists?.reduce((acc, p) => {
                    acc[p.user_id] = p.weight;
                    return acc;
                }, {}) || {};

                const groupedScoresMap = scores.reduce((acc, score) => {
                    const studentId = score.student_id;
                    const lecturerId = score.lecturer_id;
                    
                    if (!acc[studentId]) {
                        acc[studentId] = {
                            student: score.students,
                            panelistData: {},
                            remark: score.remark,
                            is_verified: score.is_verified,
                            is_locked: score.is_locked,
                            updated_at: score.updated_at,
                            lecturerId: lecturerId
                        };
                    }

                    if (!acc[studentId].panelistData[lecturerId]) {
                        acc[studentId].panelistData[lecturerId] = {
                            name: score.users.name,
                            scores: {}
                        };
                    }

                    acc[studentId].panelistData[lecturerId].scores[score.criteria_id] = score.score;
                    
                    if (new Date(score.updated_at) > new Date(acc[studentId].updated_at)) {
                        acc[studentId].updated_at = score.updated_at;
                    }

                    if (score.is_locked) acc[studentId].is_locked = true;
                    if (score.is_verified) acc[studentId].is_verified = true;
                    if (score.remark && !acc[studentId].remark) acc[studentId].remark = score.remark;

                    return acc;
                }, {});

                const groupedScores = Object.values(groupedScoresMap || {}).map(group => {
                    const weightedCriteriaScores = {};
                    let finalTotal = 0;

                    viva.criteria.forEach(c => {
                        let weightedScoreForMetric = 0;
                        Object.entries(group.panelistData).forEach(([lId, data]) => {
                            const score = data.scores[c.id];
                            const weight = panelistWeights[lId] || 0;
                            if (score !== undefined) {
                                weightedScoreForMetric += (score * weight) / 100;
                            }
                        });
                        weightedCriteriaScores[c.id] = parseFloat(weightedScoreForMetric.toFixed(2));
                        finalTotal += weightedScoreForMetric;
                    });

                    return {
                        ...group,
                        criteriaScores: weightedCriteriaScores,
                        total: parseFloat(finalTotal.toFixed(2)),
                        max_total: vivaTotal,
                        lecturerName: Object.values(group.panelistData).map(p => p.name).join(', ')
                    };
                });

                setSelectedVivaDetails(viva);
                setSelectedVivaGroupedScores(groupedScores);
            }
            setIsLoadingViva(false);
        }
        
        fetchVivaLedger();
    }, [selectedVivaId]);

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

    // Viva Ledger Filtering
    const filteredVivaGroupedScores = selectedVivaGroupedScores.filter(g => {
        const matchesUt = utQuery === "" || 
            g.student?.student_id.toLowerCase().includes(utQuery.toLowerCase()) ||
            g.student?.name.toLowerCase().includes(utQuery.toLowerCase());
        const matchesGroup = groupFilter === "" || g.student?.group_name === groupFilter;
        return matchesUt && matchesGroup;
    });

    // Viva Flat Scores Filtering (When no specific Viva is selected)
    const filteredVivaFlatScores = vivaScores.filter(v => {
        const matchesUt = utQuery === "" || 
            v.students?.student_id.toLowerCase().includes(utQuery.toLowerCase()) ||
            v.students?.name.toLowerCase().includes(utQuery.toLowerCase());
        const matchesGroup = groupFilter === "" || v.students?.group_name === groupFilter;
        const matchesViva = selectedVivaId === "" || v.viva_id === selectedVivaId;
        return matchesUt && matchesGroup && matchesViva;
    });

    // Quiz Filtering
    const filteredQuizzes = quizzes.filter(q => {
        const matchesUt = utQuery === "" || 
            q.students?.student_id.toLowerCase().includes(utQuery.toLowerCase()) ||
            q.students?.name.toLowerCase().includes(utQuery.toLowerCase());
        const matchesGroup = groupFilter === "" || q.students?.group_name === groupFilter;
        const matchesQuizName = quizNameFilter === "" || q.quiz_name === quizNameFilter;
        return matchesUt && matchesGroup && matchesQuizName;
    });

    // Pagination logic
    const paginatedFeedbacks = filteredFeedbacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const paginatedVivaGroupedScores = filteredVivaGroupedScores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const paginatedVivaFlatScores = filteredVivaFlatScores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const paginatedQuizzes = filteredQuizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderPagination = (totalItems) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (totalItems === 0) return null;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 border-t border-card-border pt-4 gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-xs text-secondary">
                        Showing <span className="font-bold text-accent-color">{Math.min(((currentPage - 1) * itemsPerPage) + 1, totalItems)}</span> to <span className="font-bold text-accent-color">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-bold text-accent-color">{totalItems}</span> entries
                    </span>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] uppercase font-bold text-tertiary">Show</label>
                        <select 
                            value={itemsPerPage} 
                            onChange={e => setItemsPerPage(Number(e.target.value))}
                            className="text-xs bg-surface-container-high border border-card-border/50 rounded px-2 py-1 outline-none focus:border-accent-color/50 transition-colors"
                        >
                            <option value={10}>10</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
                
                {totalPages > 1 && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`btn py-1 px-3 text-xs font-bold border border-card-border/50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'btn-secondary hover:bg-surface-container-high'}`}
                        >
                            Previous
                        </button>
                        
                        <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .map((page, idx, arr) => {
                                    const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                                    return (
                                        <div key={page} className="flex gap-1">
                                            {showEllipsis && <span className="text-tertiary self-end px-1">...</span>}
                                            <button 
                                                onClick={() => setCurrentPage(page)}
                                                className={`btn py-1 px-3 text-xs font-bold border transition-colors ${page === currentPage ? 'bg-accent-glow text-accent-color border-accent-color/50' : 'btn-secondary border-card-border/50 hover:bg-surface-container-high'}`}
                                            >
                                                {page}
                                            </button>
                                        </div>
                                    );
                                })
                            }
                        </div>

                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`btn py-1 px-3 text-xs font-bold border border-card-border/50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'btn-secondary hover:bg-surface-container-high'}`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        );
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
                    <div className="space-y-2 relative z-50">
                        <label className="text-xs font-bold text-secondary uppercase tracking-widest">
                            UT Number Search
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. UT001 or Name"
                            value={utQuery}
                            onChange={e => {
                                setUtQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full"
                        />
                        {showSuggestions && searchSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-card-bg border border-card-border/50 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                                {searchSuggestions.map(student => (
                                    <div 
                                        key={student.id}
                                        className="px-4 py-3 hover:bg-accent/10 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-card-border/30 last:border-0 transition-colors"
                                        onClick={() => {
                                            setUtQuery(student.id);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <span className="font-bold text-sm text-primary">{student.id}</span>
                                        <span className="text-xs text-secondary mt-1 sm:mt-0">{student.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
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
                            {paginatedFeedbacks.map(f => (
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
                    {renderPagination(filteredFeedbacks.length)}
                </div>
            )}

            {activeTab === "vivas" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-card-border/50">
                        <div className="flex-1 w-full sm:w-auto">
                            <label className="text-xs font-bold text-secondary uppercase tracking-widest block mb-2">Filter by Viva Session</label>
                            <select 
                                value={selectedVivaId}
                                onChange={(e) => setSelectedVivaId(e.target.value)}
                                className="w-full sm:max-w-md bg-surface-container-high border border-card-border/50 rounded-lg px-4 py-2 text-sm outline-none focus:border-accent-color/50 transition-colors"
                            >
                                <option value="">-- All Viva Sessions (Raw Records) --</option>
                                {vivas.map(v => <option key={v.id} value={v.id}>{v.name} (Weighted Ledger)</option>)}
                            </select>
                        </div>
                        {selectedVivaDetails && filteredVivaGroupedScores.length > 0 && (
                            <ExportVivaReport viva={selectedVivaDetails} groupedScores={filteredVivaGroupedScores} />
                        )}
                    </div>

                    {!selectedVivaId ? (
                        <div className="card h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span className="text-accent-color">📋</span> All Viva Records
                                </h3>
                            </div>
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>UT Number</th>
                                            <th>Student Name</th>
                                            <th>Group</th>
                                            <th>Event Name</th>
                                            <th>Metric</th>
                                            <th>Score</th>
                                            <th>Lecturer</th>
                                            <th>Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedVivaFlatScores.map(v => (
                                            <tr key={v.id}>
                                                <td className="text-xs text-secondary">{new Date(v.viva_events?.viva_date).toLocaleDateString()}</td>
                                                <td className="font-bold text-sm">{v.students?.student_id}</td>
                                                <td className="text-primary font-bold">{v.students?.name}</td>
                                                <td><span className="badge bg-surface-container text-secondary text-[10px]">{v.students?.group_name}</span></td>
                                                <td className="text-xs font-bold">{v.viva_events?.name}</td>
                                                <td className="text-xs text-secondary">{v.viva_criteria?.name}</td>
                                                <td className="font-bold text-accent-color">{v.score} / {v.viva_criteria?.max_marks}</td>
                                                <td className="text-xs text-accent-light">{v.users?.name}</td>
                                                <td className="text-xs text-secondary italic max-w-xs truncate" title={v.remark}>{v.remark || "-"}</td>
                                            </tr>
                                        ))}
                                        {filteredVivaFlatScores.length === 0 && <tr><td colSpan="9" className="text-center p-8 text-secondary">No viva scores recorded.</td></tr>}
                                    </tbody>
                                </table>
                                {renderPagination(filteredVivaFlatScores.length)}
                            </div>
                        </div>
                    ) : isLoadingViva ? (
                        <div className="text-center py-16 card">
                            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-accent-color rounded-full mb-3" role="status" aria-label="loading"></div>
                            <p className="text-secondary">Loading ledger data...</p>
                        </div>
                    ) : (
                        <div className="card h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span className="text-accent-color">📋</span> {selectedVivaDetails?.name} - Weighted Ledger
                                </h3>
                            </div>
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Panelists</th>
                                            {selectedVivaDetails?.criteria.map(c => (
                                                <th key={c.id}>{c.name} <br/><span className="text-[10px] opacity-50 font-normal">(Max {c.max_marks})</span></th>
                                            ))}
                                            <th>Weighted Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedVivaGroupedScores.map((group, idx) => (
                                            <tr key={idx} className="hover:bg-surface-container-high/30">
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-xs">
                                                            {group.student.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm m-0">{group.student.name}</p>
                                                            <p className="text-[10px] text-tertiary uppercase tracking-wider">{group.student.student_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.values(group.panelistData).map((p, pi) => (
                                                            <span key={pi} className="text-[10px] bg-surface-container-highest px-1.5 py-0.5 rounded">
                                                                {p.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-tertiary mt-1">Last updated: {new Date(group.updated_at).toLocaleDateString()}</p>
                                                </td>
                                                {selectedVivaDetails?.criteria.map(c => (
                                                    <td key={c.id} className="text-sm font-medium">
                                                        {group.criteriaScores[c.id]}
                                                        <span className="text-[10px] text-tertiary ml-1">/{c.max_marks}</span>
                                                    </td>
                                                ))}
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-accent-color">{group.total} / {group.max_total}</span>
                                                        <span className="text-[10px] text-secondary">({((group.total / group.max_total) * 100).toFixed(1)}%)</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={`badge ${group.is_locked ? 'badge-admin' : 'badge-lecturer'}`} style={{ fontSize: '10px' }}>
                                                        {group.is_locked ? (group.is_verified ? 'VERIFIED' : 'SUBMITTED') : 'DRAFT'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredVivaGroupedScores.length === 0 && (
                                            <tr><td colSpan="10" className="text-center p-8 text-secondary">No records found for this selection.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                                {renderPagination(filteredVivaGroupedScores.length)}
                            </div>
                        </div>
                    )}
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
                            {paginatedQuizzes.map(q => (
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
                    {renderPagination(filteredQuizzes.length)}
                </div>
            )}
        </div>
    );
}
