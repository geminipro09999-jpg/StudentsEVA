"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceUpload() {
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
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

                const normalized = parsed.map((row, i) => {
                    const ut = String(row['ut_number'] || row['UT_Number'] || row['UT Number'] || '').trim();
                    const month = parseInt(row['month'] || row['Month'] || 0);
                    const year = parseInt(row['year'] || row['Year'] || 0);
                    const present = parseInt(row['present_days'] || row['Present Days'] || 0);
                    const total = parseInt(row['total_days'] || row['Total Days'] || 0);
                    return { _row: i + 2, ut_number: ut, month, year, present_days: present, total_days: total };
                }).filter(r => r.ut_number);

                if (normalized.length === 0) {
                    toast.error("No valid rows found. Check your column names.");
                    return;
                }
                setRows(normalized);
                toast.success(`${normalized.length} rows parsed from "${file.name}"`);
            } catch {
                toast.error("Failed to parse file. Make sure it's a valid .xlsx or .csv file.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function handleFileInput(e) {
        parseFile(e.target.files[0]);
    }

    function handleDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        parseFile(e.dataTransfer.files[0]);
    }

    async function handleUpload() {
        if (rows.length === 0) return;
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows }),
            });
            const result = await res.json();
            if (!res.ok) {
                toast.error(result.error || 'Upload failed');
            } else {
                toast.success(`✅ ${result.count} attendance records uploaded successfully!`);
                setRows([]);
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function handleClear() {
        setRows([]);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    return (
        <div>
            {/* Upload Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? 'var(--accent-color)' : 'var(--card-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                    marginBottom: '1.5rem',
                }}
            >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {fileName ? `📎 ${fileName}` : 'Drag & Drop your Excel file here'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    or click to browse — supports <strong>.xlsx</strong> and <strong>.csv</strong>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                    Required columns: <code style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>ut_number</code> &nbsp;
                    <code style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>month</code> &nbsp;
                    <code style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>year</code> &nbsp;
                    <code style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>present_days</code> &nbsp;
                    <code style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>total_days</code>
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Preview Table */}
            {rows.length > 0 && (
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                            Preview — {rows.length} Rows
                        </h3>
                        <button onClick={handleClear} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
                            Clear
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    {['Row', 'UT Number', 'Month', 'Year', 'Present Days', 'Total Days', 'Attendance %'].map(h => (
                                        <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const pct = row.total_days > 0 ? ((row.present_days / row.total_days) * 100).toFixed(1) : 0;
                                    const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                    const isValid = row.ut_number && row.month >= 1 && row.month <= 12 && row.year > 2000 && row.present_days <= row.total_days;
                                    return (
                                        <tr key={row._row} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isValid ? '' : 'rgba(239,68,68,0.05)' }}>
                                            <td style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)' }}>{row._row}</td>
                                            <td style={{ padding: '0.6rem 1rem', fontWeight: '600' }}>{row.ut_number}</td>
                                            <td style={{ padding: '0.6rem 1rem' }}>{MONTH_NAMES[row.month] || row.month}</td>
                                            <td style={{ padding: '0.6rem 1rem' }}>{row.year}</td>
                                            <td style={{ padding: '0.6rem 1rem' }}>{row.present_days}</td>
                                            <td style={{ padding: '0.6rem 1rem' }}>{row.total_days}</td>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                <span style={{ background: `${color}22`, color, padding: '2px 10px', borderRadius: '999px', fontWeight: '600', fontSize: '0.85rem' }}>
                                                    {pct}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ minWidth: '160px' }}
                        >
                            {loading ? '⏳ Uploading...' : `⬆️ Upload ${rows.length} Records`}
                        </button>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--accent-color)' }}>ℹ️ Upload Rules:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
                    <li>UT numbers must match existing students in the system</li>
                    <li>Month should be 1–12 (e.g. 4 for April)</li>
                    <li>Re-uploading the same student + month will <strong>overwrite</strong> previous data</li>
                    <li>Download the <a href="/sample_attendance.xlsx" download style={{ color: 'var(--accent-color)' }}>sample Excel template</a> for reference</li>
                </ul>
            </div>
        </div>
    );
}
