"use client";

import { useState, useEffect } from "react";
import { bulkImportVivaScores } from "@/app/actions/scoringActions";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function VivaMetricImportModal({ vivaId, criteria }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCriteriaId, setSelectedCriteriaId] = useState(criteria[0]?.id || "");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [studentMap, setStudentMap] = useState(new Map());

    useEffect(() => {
        const fetchStudents = async () => {
            const { data } = await supabase.from('students').select('id, student_id, name');
            if (data) {
                const map = new Map(data.map(s => [s.student_id, s]));
                setStudentMap(map);
            }
        };
        if (isOpen) fetchStudents();
    }, [isOpen]);

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

                const currentCriteria = criteria.find(c => c.id === selectedCriteriaId);
                const maxMarks = currentCriteria?.max_marks || 100;

                const processed = rawData.map((row, idx) => {
                    const utNumber = String(row['UT Number'] || row['Student ID'] || row.student_id || row['UT_Number'] || '').trim();
                    const score = parseFloat(row['Score'] || row['Marks'] || row['Result'] || row.score || 0);
                    const student = studentMap.get(utNumber);
                    
                    return {
                        id: idx,
                        utNumber,
                        score,
                        studentName: student?.name || "NOT FOUND",
                        isValid: !!student && !isNaN(score) && score <= maxMarks,
                        error: !student ? "Student ID not matched" : (isNaN(score) ? "Invalid score" : (score > maxMarks ? `Score exceeds max (${maxMarks})` : null))
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
        if (!previewData || !selectedCriteriaId) return;
        
        const validData = previewData.filter(p => p.isValid).map(p => ({
            utNumber: p.utNumber,
            score: p.score
        }));

        if (validData.length === 0) return toast.error("No valid data to import");

        setLoading(true);
        const res = await bulkImportVivaScores(vivaId, selectedCriteriaId, validData);
        if (res.success) {
            toast.success(`Successfully imported ${res.count} scores!`);
            setIsOpen(false);
            window.location.reload();
        } else {
            toast.error(res.error || "Failed to import scores");
        }
        setLoading(false);
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="btn btn-secondary flex items-center gap-2">
                <span>📥</span> Bulk Import Scores
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-container p-8 rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in-scale max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold m-0">Bulk Import Metric Scores</h3>
                                <p className="text-secondary text-sm">Upload CSV/Excel to mass-assign scores to a criteria</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-secondary hover:text-primary">✕</button>
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary uppercase tracking-widest">Select Criteria</label>
                                    <select 
                                        value={selectedCriteriaId}
                                        onChange={(e) => {
                                            setSelectedCriteriaId(e.target.value);
                                            setPreviewData(null); // Reset preview when criteria changes
                                        }}
                                        className="w-full"
                                    >
                                        {criteria.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} (Max {c.max_marks})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary uppercase tracking-widest">Select File (CSV/Excel)</label>
                                    <input 
                                        type="file" 
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileChange}
                                        className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent-light file:text-accent-color hover:file:bg-accent/20 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {previewData && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-3 bg-success/10 rounded-xl border border-success/20 text-center">
                                            <p className="text-[10px] uppercase font-bold text-success mb-1">Ready to Import</p>
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
                                                    <th className="p-3">Student Name</th>
                                                    <th className="p-3">Score</th>
                                                    <th className="p-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-card-border">
                                                {previewData.slice(0, 50).map((row) => (
                                                    <tr key={row.id} className={row.isValid ? "" : "bg-danger/5"}>
                                                        <td className="p-3 font-mono">{row.utNumber}</td>
                                                        <td className="p-3">{row.studentName}</td>
                                                        <td className="p-3 font-bold text-accent-color">{row.score}</td>
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
                                        {previewData.length > 50 && (
                                            <p className="text-center text-[10px] text-tertiary py-2 bg-surface-container-low">Showing first 50 rows only...</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!previewData && (
                                <div className="bg-accent-light/30 p-4 rounded-xl">
                                    <p className="text-[10px] text-accent-color font-bold uppercase mb-2">File Format:</p>
                                    <ul className="text-[11px] text-secondary space-y-1 m-0">
                                        <li>• Required columns: <strong>UT Number</strong> and <strong>Score</strong></li>
                                        <li>• Scores must not exceed the maximum for the selected criteria.</li>
                                        <li>• Use this to bulk-upload Quiz results or any other metric.</li>
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
