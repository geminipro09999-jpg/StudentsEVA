"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function InvoiceGenerator({ entries, lecturers }) {
    const currentDate = new Date();
    const [selectedLecturer, setSelectedLecturer] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

    const lecturerMap = useMemo(() => {
        const m = {};
        (lecturers || []).forEach(l => { m[l.id] = l; });
        return m;
    }, [lecturers]);

    const filteredEntries = useMemo(() => {
        return (entries || []).filter(e => {
            if (e.status !== 'approved') return false;
            if (selectedLecturer && e.lecturer_id !== selectedLecturer) return false;
            const d = new Date(e.work_date);
            if (selectedMonth && (d.getMonth() + 1) !== Number(selectedMonth)) return false;
            if (selectedYear && d.getFullYear() !== Number(selectedYear)) return false;
            return true;
        }).sort((a, b) => new Date(a.work_date) - new Date(b.work_date));
    }, [entries, selectedLecturer, selectedMonth, selectedYear]);

    const totalHours = filteredEntries.reduce((s, e) => s + Number(e.hours), 0);
    const lecturerInfo = lecturerMap[selectedLecturer];
    const periodLabel = `${MONTH_NAMES[Number(selectedMonth)] || ''} ${selectedYear}`;

    const availableYears = useMemo(() => {
        const years = [...new Set((entries || []).map(e => new Date(e.work_date).getFullYear()))].sort((a, b) => b - a);
        if (years.length === 0) years.push(currentDate.getFullYear());
        return years;
    }, [entries]);

    async function exportPDF() {
        if (!selectedLecturer || filteredEntries.length === 0) {
            toast.error("Select a lecturer with approved entries first");
            return;
        }
        try {
            // Import jsPDF
            const jspdfModule = await import('jspdf');
            const jsPDF = jspdfModule.default || jspdfModule.jsPDF;

            // Import autoTable
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = autoTableModule.default;

            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('TIMESHEET INVOICE', 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Student Evaluation System — UnicomTIC', 105, 28, { align: 'center' });

            doc.setDrawColor(99, 102, 241);
            doc.setLineWidth(0.5);
            doc.line(20, 32, 190, 32);

            // Lecturer Info
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Lecturer:', 20, 42);
            doc.setFont('helvetica', 'normal');
            doc.text(lecturerInfo?.name || 'Unknown', 50, 42);

            doc.setFont('helvetica', 'bold');
            doc.text('Email:', 120, 42);
            doc.setFont('helvetica', 'normal');
            doc.text(lecturerInfo?.email || '—', 140, 42);

            doc.setFont('helvetica', 'bold');
            doc.text('Period:', 20, 50);
            doc.setFont('helvetica', 'normal');
            doc.text(periodLabel, 50, 50);

            doc.setFont('helvetica', 'bold');
            doc.text('Generated:', 120, 50);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date().toLocaleDateString(), 150, 50);

            // Table
            const tableData = filteredEntries.map((e, i) => [
                i + 1,
                new Date(e.work_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                e.in_time?.slice(0, 5),
                e.out_time?.slice(0, 5),
                Number(e.hours).toFixed(2),
            ]);

            tableData.push(['', '', '', 'TOTAL', totalHours.toFixed(2)]);

            // Use the imported autoTable function directly
            if (typeof autoTable === 'function') {
                autoTable(doc, {
                    startY: 58,
                    head: [['#', 'Date', 'In Time', 'Out Time', 'Hours']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold', fontSize: 9 },
                    bodyStyles: { fontSize: 9 },
                    columnStyles: { 0: { cellWidth: 12 }, 4: { fontStyle: 'bold', halign: 'center' } },
                    didParseCell: function (data) {
                        if (data.row.index === tableData.length - 1) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [240, 240, 255];
                        }
                    },
                });
            } else if (doc.autoTable) {
                doc.autoTable({
                    startY: 58,
                    head: [['#', 'Date', 'In Time', 'Out Time', 'Hours']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold', fontSize: 9 },
                    bodyStyles: { fontSize: 9 },
                    columnStyles: { 0: { cellWidth: 12 }, 4: { fontStyle: 'bold', halign: 'center' } },
                });
            } else {
                throw new Error("PDF Table plugin not loaded correctly");
            }

            // Footer
            const finalY = doc.lastAutoTable?.finalY || 200;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('This is a system-generated invoice from the Student Evaluation System.', 105, finalY + 10, { align: 'center' });

            // Signature lines
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(25, finalY + 25, 85, finalY + 25);
            doc.line(125, finalY + 25, 185, finalY + 25);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('Lecturer Signature', 55, finalY + 32, { align: 'center' });
            doc.text('Admin Signature', 155, finalY + 32, { align: 'center' });

            doc.save(`Invoice_${lecturerInfo?.name?.replace(/\s+/g, '_') || 'lecturer'}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
            toast.success('📄 PDF downloaded!');
        } catch (err) {
            console.error("PDF Gen Error:", err);
            toast.error(`PDF Error: ${err.message || 'Check console'}`);
        }
    }

    async function exportWord() {
        if (!selectedLecturer || filteredEntries.length === 0) {
            toast.error("Select a lecturer with approved entries first");
            return;
        }
        try {
            const docx = await import('docx');
            const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;

            const headerBorder = {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
            };

            const tableRows = [
                new TableRow({
                    tableHeader: true,
                    children: ['#', 'Date', 'In Time', 'Out Time', 'Hours'].map(h =>
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                            shading: { fill: '6366F1' },
                            borders: headerBorder,
                            width: { size: h === '#' ? 8 : 23, type: WidthType.PERCENTAGE },
                        })
                    ),
                }),
                ...filteredEntries.map((e, i) =>
                    new TableRow({
                        children: [
                            String(i + 1),
                            new Date(e.work_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                            e.in_time?.slice(0, 5),
                            e.out_time?.slice(0, 5),
                            Number(e.hours).toFixed(2),
                        ].map((val, ci) =>
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: val, size: 18, bold: ci === 4 })], alignment: ci === 0 || ci === 4 ? AlignmentType.CENTER : AlignmentType.LEFT })],
                                borders: headerBorder,
                            })
                        ),
                    })
                ),
                new TableRow({
                    children: [
                        ...['', '', '', 'TOTAL'].map(v =>
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: v, bold: true, size: 20 })], alignment: AlignmentType.RIGHT })],
                                borders: headerBorder,
                                shading: { fill: 'F0F0FF' },
                            })
                        ),
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: totalHours.toFixed(2), bold: true, size: 22 })], alignment: AlignmentType.CENTER })],
                            borders: headerBorder,
                            shading: { fill: 'F0F0FF' },
                        }),
                    ],
                }),
            ];

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ children: [new TextRun({ text: 'TIMESHEET INVOICE', bold: true, size: 36 })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: 'Student Evaluation System — UnicomTIC and Innovation Center', size: 20, color: '666666' })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
                        new Paragraph({ children: [new TextRun({ text: 'Lecturer: ', bold: true, size: 22 }), new TextRun({ text: lecturerInfo?.name || 'Unknown', size: 22 })], spacing: { after: 80 } }),
                        new Paragraph({ children: [new TextRun({ text: 'Email: ', bold: true, size: 22 }), new TextRun({ text: lecturerInfo?.email || '—', size: 22 })], spacing: { after: 80 } }),
                        new Paragraph({ children: [new TextRun({ text: 'Period: ', bold: true, size: 22 }), new TextRun({ text: periodLabel, size: 22 })], spacing: { after: 80 } }),
                        new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, size: 18, color: '999999' })], spacing: { after: 300 } }),
                        new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                        new Paragraph({ text: '', spacing: { before: 600 } }),
                        new Paragraph({ children: [new TextRun({ text: '____________________________                                              ____________________________', size: 20 })], spacing: { before: 400 } }),
                        new Paragraph({ children: [new TextRun({ text: '      Lecturer Signature                                                                   Admin Signature', size: 18, color: '666666' })] }),
                        new Paragraph({ text: '', spacing: { before: 300 } }),
                        new Paragraph({ children: [new TextRun({ text: 'This is a system-generated invoice from the Student Evaluation System.', italics: true, size: 16, color: '999999' })], alignment: AlignmentType.CENTER }),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${lecturerInfo?.name?.replace(/\s+/g, '_') || 'lecturer'}_${periodLabel.replace(/\s+/g, '_')}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('📝 Word document downloaded!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate Word file');
        }
    }

    return (
        <div>
            {/* Filters */}
            <div className="glass-card mb-4" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label>Lecturer *</label>
                        <select value={selectedLecturer} onChange={e => setSelectedLecturer(e.target.value)} style={{ width: '100%' }}>
                            <option value="">— Select Lecturer —</option>
                            {(lecturers || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Month</label>
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: '100%' }}>
                            {MONTH_NAMES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Year</label>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: '100%' }}>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Invoice Preview */}
            {!selectedLecturer ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                    <p>Select a lecturer to preview their invoice</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                    <p>No approved entries for {lecturerInfo?.name} in {periodLabel}</p>
                </div>
            ) : (
                <div className="glass-card animate-fade-in-scale" style={{ padding: '2.5rem' }}>
                    {/* Invoice Header */}
                    <div className="text-center mb-8 pb-4 border-b-2 border-accent">
                        <h2 className="text-3xl font-extrabold text-accent tracking-tight">TIMESHEET INVOICE</h2>
                        <p className="text-secondary text-sm mt-1">Student Evaluation System — UnicomTIC and Innovation Center</p>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-8 p-4 rounded-xl bg-black/10 border border-card-border">
                        <div className="flex gap-2"><strong>Lecturer:</strong> <span className="text-primary font-medium">{lecturerInfo?.name}</span></div>
                        <div className="flex gap-2"><strong>Email:</strong> <span className="text-secondary">{lecturerInfo?.email || '—'}</span></div>
                        <div className="flex gap-2"><strong>Period:</strong> <span className="text-primary font-medium">{periodLabel}</span></div>
                        <div className="flex gap-2"><strong>Generated:</strong> <span className="text-secondary">{new Date().toLocaleDateString()}</span></div>
                    </div>

                    {/* Table */}
                    <div className="table-container mb-8">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {['#', 'Date', 'In Time', 'Out Time', 'Hours'].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((e, i) => (
                                    <tr key={e.id}>
                                        <td className="text-secondary">{i + 1}</td>
                                        <td className="font-medium">
                                            {new Date(e.work_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td>{e.in_time?.slice(0, 5)}</td>
                                        <td>{e.out_time?.slice(0, 5)}</td>
                                        <td className="font-bold text-accent">{Number(e.hours).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-accent-light font-bold" style={{ borderTop: '2px solid var(--accent-color)' }}>
                                    <td colSpan="4" className="text-right py-4 text-base">TOTAL APPROVED HOURS</td>
                                    <td className="text-lg text-accent py-4">{totalHours.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex gap-4 justify-end wrap">
                        <button onClick={exportWord} className="btn btn-secondary">
                            📝 Export Word
                        </button>
                        <button onClick={exportPDF} className="btn btn-primary">
                            📄 Download PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
