"use client";

import { useState, useRef } from "react";
import { importQuizMarks } from "@/app/actions/quizActions";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import Link from "next/link";

export default function QuizImportPage() {
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [quizName, setQuizName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [report, setReport] = useState(null);
    const fileInputRef = useRef(null);

    function parseFile(file) {
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (parsed.length === 0) {
                    toast.error("No valid rows found.");
                    return;
                }
                setRows(parsed);
                toast.success(`${parsed.length} rows parsed from "${file.name}"`);
            } catch {
                toast.error("Failed to parse file.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function handleUpload() {
        if (rows.length === 0) return;
        if (!quizName) return toast.error("Please enter a quiz name");
        
        setLoading(true);
        setReport(null);
        const res = await importQuizMarks(rows, quizName);
        if (res.success) {
            toast.success(`Imported ${res.importedCount} marks successfully!`);
            if (res.errorCount > 0) {
                setReport(res);
            } else {
                setRows([]);
                setFileName('');
            }
        } else {
            toast.error(res.error || "Upload failed");
        }
        setLoading(false);
    }

    return (
        <div className="container animate-fade-in mt-4">
            <div className="page-hero">
                <h2>Quiz Marks Bulk Import</h2>
                <p>Upload a CSV/Excel file to match UT Numbers and update marks.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <label>Quiz Name / Title</label>
                        <input 
                            type="text" 
                            value={quizName} 
                            onChange={(e) => setQuizName(e.target.value)}
                            placeholder="e.g., JavaScript Module 1 Quiz"
                            className="mb-6"
                        />

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); parseFile(e.dataTransfer.files[0]); }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-12 text-center cursor-pointer transition-all border-2 border-dashed rounded-2xl ${isDragging ? 'border-accent-color bg-accent-light' : 'border-card-border bg-surface-container-lowest'}`}
                        >
                            <div className="text-5xl mb-4">📄</div>
                            <p className="text-xl font-bold mb-2">
                                {fileName ? `📎 ${fileName}` : 'Drop Excel/CSV file here'}
                            </p>
                            <p className="text-secondary text-sm">
                                or click to browse (supports .xlsx, .csv)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => parseFile(e.target.files[0])}
                                className="hidden"
                            />
                        </div>

                        {rows.length > 0 && (
                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={() => { setRows([]); setFileName(''); }} className="btn btn-secondary">Clear</button>
                                <button 
                                    onClick={handleUpload} 
                                    disabled={loading} 
                                    className="btn btn-primary"
                                >
                                    {loading ? '⏳ Importing...' : `⬆️ Import ${rows.length} Rows`}
                                </button>
                            </div>
                        )}
                    </div>

                    {report && (
                        <div className="card border-danger bg-danger/5">
                            <h3 className="text-lg font-bold text-danger mb-4">Error Report ({report.errorCount} errors)</h3>
                            <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                {report.errors.map((err, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-danger/20 text-sm">
                                        <span className="font-bold">Row {err.row}:</span> {err.error} {err.utNumber && `(${err.utNumber})`}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="card accent">
                        <h3 className="text-lg font-bold mb-4">Import Instructions</h3>
                        <ul className="space-y-3 text-sm text-secondary list-disc pl-4">
                            <li>File must have a column named <code className="bg-accent-light px-1 rounded">UT Number</code> or <code className="bg-accent-light px-1 rounded">Student ID</code>.</li>
                            <li>A column named <code className="bg-accent-light px-1 rounded">Marks</code> or <code className="bg-accent-light px-1 rounded">Score</code> is required.</li>
                            <li>The system will match students automatically.</li>
                            <li>Students not found in the database will be reported as errors.</li>
                        </ul>
                    </div>
                    
                    <Link href="/dashboard" className="btn btn-secondary w-full">Back to Dashboard</Link>
                </div>
            </div>
        </div>
    );
}
