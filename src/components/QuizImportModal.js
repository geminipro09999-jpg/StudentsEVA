"use client";

import { useState, useEffect } from "react";
import { importQuizMarks } from "@/app/actions/quizActions";
import { getVivas, getVivaDetails } from "@/app/actions/vivaActions";
import { bulkImportVivaScores } from "@/app/actions/scoringActions";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function QuizImportModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [quizName, setQuizName] = useState("");
    const [totalQuestions, setTotalQuestions] = useState(10);
    const [totalMarks, setTotalMarks] = useState(100);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [studentMap, setStudentMap] = useState(new Map());
    
    // Viva Integration State
    const [vivas, setVivas] = useState([]);
    const [selectedVivaId, setSelectedVivaId] = useState("");
    const [vivaCriteria, setVivaCriteria] = useState([]);
    const [selectedCriteriaId, setSelectedCriteriaId] = useState("");

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            const { data: students } = await supabase.from('students').select('id, student_id, name');
            if (students) {
                const map = new Map(students.map(s => [s.student_id, s]));
                setStudentMap(map);
            }
            
            const { data: vivaList } = await getVivas();
            if (vivaList) setVivas(vivaList);
        };
        if (isOpen) fetchData();
    }, [isOpen]);

    // Fetch criteria when viva is selected
    useEffect(() => {
        const fetchCriteria = async () => {
            if (!selectedVivaId) {
                setVivaCriteria([]);
                setSelectedCriteriaId("");
                return;
            }
            const { data } = await getVivaDetails(selectedVivaId);
            if (data?.criteria) {
                setVivaCriteria(data.criteria);
                // Try to auto-select "Quiz" criteria if it exists
                const quizCrit = data.criteria.find(c => c.name.toLowerCase().includes('quiz'));
                if (quizCrit) {
                    setSelectedCriteriaId(quizCrit.id);
                    setTotalMarks(quizCrit.max_marks);
                } else if (data.criteria.length > 0) {
                    setSelectedCriteriaId(data.criteria[0].id);
                    setTotalMarks(data.criteria[0].max_marks);
                }
            }
        };
        fetchCriteria();
    }, [selectedVivaId]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (selectedFile) generatePreview(selectedFile);
    };

    const generatePreview = (selectedFile) => {
        const reader = new FileReader();
        const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");

        reader.onload = (event) => {
            let rawData = [];
            try {
                if (isExcel) {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    rawData = XLSX.utils.sheet_to_json(firstSheet);
                } else {
                    const text = event.target.result;
                    const rows = text.split("\n").filter(line => line.trim());
                    const headers = rows[0].split(",").map(h => h.trim());
                    rawData = rows.slice(1).map(row => {
                        const values = row.split(",").map(v => v.trim());
                        const obj = {};
                        headers.forEach((h, i) => obj[h] = values[i]);
                        return obj;
                    });
                }

                const processed = rawData.map((row, idx) => {
                    const utNumber = String(row['UT Number'] || row['Student ID'] || row.student_id || row['UT_Number'] || '').trim();
                    const rightAnswers = parseFloat(row['Right Answers'] || row['Correct'] || row['Score'] || row['marks'] || 0);
                    const marks = totalQuestions > 0 ? (rightAnswers / totalQuestions) * totalMarks : 0;
                    const student = studentMap.get(utNumber);
                    
                    return {
                        id: idx,
                        utNumber,
                        rightAnswers,
                        marks: parseFloat(marks.toFixed(2)),
                        studentName: student?.name || "NOT FOUND",
                        isValid: !!student && !isNaN(rightAnswers),
                        error: !student ? "Student ID not matched" : (isNaN(rightAnswers) ? "Invalid count" : null)
                    };
                });

                setPreviewData(processed);
            } catch (err) {
                toast.error("Error parsing file: " + err.message);
            }
        };

        if (isExcel) {
            reader.readAsArrayBuffer(selectedFile);
        } else {
            reader.readAsText(selectedFile);
        }
    };

    const handleConfirm = async () => {
        if (!previewData || !quizName) return;
        
        setLoading(true);
        try {
            // Prepare data for import
            const finalData = previewData.filter(p => p.isValid).map(p => ({
                utNumber: p.utNumber,
                score: p.marks
            }));

            if (finalData.length === 0) throw new Error("No valid data to import");

            let res;
            if (selectedVivaId && selectedCriteriaId) {
                // Import directly into Viva scores
                res = await bulkImportVivaScores(selectedVivaId, selectedCriteriaId, finalData);
            } else {
                // Import into generic Quiz Marks table
                res = await importQuizMarks(finalData, quizName, totalMarks);
            }

            if (res.success) {
                toast.success(`Successfully imported ${res.importedCount || res.count} records!`);
                setIsOpen(false);
                window.location.reload();
            } else {
                throw new Error(res.error || "Failed to import");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="btn btn-secondary flex items-center gap-2 shadow-sm hover:translate-y-[-2px] transition-all">
                <span>📊</span> Import Quiz Marks
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-container p-8 rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in-scale max-h-[90vh] flex flex-col border border-card-border">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-bold m-0 bg-primary-gradient bg-clip-text text-transparent">Import Quiz & Viva Scores</h3>
                                <p className="text-secondary text-sm mt-1">Select a Viva session to link these marks to a report</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary hover:bg-danger/10 hover:text-danger transition-all">✕</button>
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {/* NEW: Viva Selection Section */}
                            <div className="p-5 rounded-2xl bg-accent-glow/30 border border-accent-color/20 space-y-4">
                                <div className="flex items-center gap-2 text-accent-color mb-2">
                                    <span className="text-lg">🔗</span>
                                    <h4 className="text-xs font-bold uppercase tracking-widest m-0">Link to Viva Session</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-tertiary">Select Viva Event</label>
                                        <select 
                                            value={selectedVivaId} 
                                            onChange={(e) => setSelectedVivaId(e.target.value)}
                                            className="w-full bg-surface-container-high border-none"
                                        >
                                            <option value="">None (Generic Quiz Marks Only)</option>
                                            {vivas.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} ({new Date(v.viva_date).toLocaleDateString()})</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedVivaId && (
                                        <div className="space-y-1 animate-fade-in">
                                            <label className="text-[10px] uppercase font-bold text-tertiary">Select Target Metric</label>
                                            <select 
                                                value={selectedCriteriaId} 
                                                onChange={(e) => setSelectedCriteriaId(e.target.value)}
                                                className="w-full bg-surface-container-high border-none"
                                                required={!!selectedVivaId}
                                            >
                                                <option value="" disabled>Choose metric...</option>
                                                {vivaCriteria.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} (Max {c.max_marks})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                {selectedVivaId && (
                                    <p className="text-[10px] text-accent-color m-0 font-medium">✨ These marks will automatically appear in the Viva Report under the selected metric.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-tertiary">Import Reference Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Week 1 Quiz"
                                        value={quizName}
                                        onChange={(e) => setQuizName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-tertiary">Total Questions in File</label>
                                    <input 
                                        type="number" 
                                        value={totalQuestions}
                                        onChange={(e) => setTotalQuestions(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-tertiary">Target Weight (Marks)</label>
                                    <input 
                                        type="number" 
                                        value={totalMarks}
                                        onChange={(e) => setTotalMarks(e.target.value)}
                                        required
                                        disabled={!!selectedCriteriaId}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-secondary uppercase tracking-widest">Select CSV File</label>
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent-light file:text-accent-color hover:file:bg-accent/20 cursor-pointer"
                                />
                            </div>

                            {previewData && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-3 bg-success/10 rounded-xl border border-success/20 text-center">
                                            <p className="text-[10px] uppercase font-bold text-success mb-1">Valid Matches</p>
                                            <p className="text-2xl font-black text-success">{previewData.filter(p => p.isValid).length}</p>
                                        </div>
                                        <div className="flex-1 p-3 bg-danger/10 rounded-xl border border-danger/20 text-center">
                                            <p className="text-[10px] uppercase font-bold text-danger mb-1">Errors</p>
                                            <p className="text-2xl font-black text-danger">{previewData.filter(p => !p.isValid).length}</p>
                                        </div>
                                    </div>

                                    <div className="border border-card-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-surface-container-highest">
                                                <tr className="text-left text-[10px] uppercase tracking-widest text-secondary">
                                                    <th className="p-3">UT Number</th>
                                                    <th className="p-3">Right Answers</th>
                                                    <th className="p-3">Final Marks</th>
                                                    <th className="p-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-card-border">
                                                {previewData.map((row) => (
                                                    <tr key={row.id} className={row.isValid ? "" : "bg-danger/5"}>
                                                        <td className="p-3 font-mono">{row.utNumber}</td>
                                                        <td className="p-3">{row.rightAnswers} / {totalQuestions}</td>
                                                        <td className="p-3 font-bold text-accent-color">{row.marks}</td>
                                                        <td className="p-3">
                                                            {row.isValid ? (
                                                                <span className="text-success text-[10px] font-bold uppercase">✅ OK</span>
                                                            ) : (
                                                                <span className="text-danger text-[10px] font-bold uppercase">❌ {row.error}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {!previewData && (
                                <div className="bg-accent-light/30 p-4 rounded-xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-[10px] text-accent-color font-bold uppercase m-0">CSV Format Requirements:</p>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const csvContent = "UT Number, Right Answers\nUT001, 15\nUT002, 12\nUT003, 18";
                                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = "quiz_import_template.csv";
                                                a.click();
                                            }}
                                            className="text-[10px] text-accent-color font-bold uppercase underline hover:opacity-70"
                                        >
                                            Download Example CSV
                                        </button>
                                    </div>
                                    <ul className="text-[11px] text-secondary space-y-1 m-0">
                                        <li>• Headers required: <strong>UT Number</strong> and <strong>Right Answers</strong></li>
                                        <li>• The system will calculate: (Right Answers / {totalQuestions}) × {totalMarks}</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-card-border mt-auto">
                            <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
                            <button 
                                type="button" 
                                onClick={handleConfirm} 
                                disabled={loading || !previewData || previewData.filter(p => p.isValid).length === 0} 
                                className="btn btn-primary flex-1"
                            >
                                {loading ? "Importing..." : previewData ? "Approve & Import" : "Select File First"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
