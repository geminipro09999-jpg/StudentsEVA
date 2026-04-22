"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function InvoiceGenerator({ entries, lecturers, currentUserId, isAdmin }) {
    const currentDate = new Date();
    const [selectedLecturer, setSelectedLecturer] = useState(isAdmin ? '' : (currentUserId || ''));
    const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
    const [deduction, setDeduction] = useState(0);

    const lecturerMap = useMemo(() => {
        const m = {};
        (lecturers || []).forEach(l => { m[l.id] = l; });
        return m;
    }, [lecturers]);

    const lecturerInfo = lecturerMap[selectedLecturer];
    const userRoles = lecturerInfo?.roles || [lecturerInfo?.role];
    const isLecturerRole = userRoles.includes('lecturer');
    const isStaffRole = userRoles.includes('incubator_staff');

    const filteredEntries = useMemo(() => {
        return (entries || []).filter(e => {
            if (e.status !== 'approved') return false;
            // Only show entries for the selected person
            if (selectedLecturer && e.lecturer_id !== selectedLecturer) return false;
            const d = new Date(e.work_date);
            if (selectedMonth && (d.getMonth() + 1) !== Number(selectedMonth)) return false;
            if (selectedYear && d.getFullYear() !== Number(selectedYear)) return false;
            return true;
        }).sort((a, b) => new Date(a.work_date) - new Date(b.work_date));
    }, [entries, selectedLecturer, selectedMonth, selectedYear]);

    const totalHours = filteredEntries.reduce((s, e) => s + Number(e.hours), 0);
    // Salary calculation (can be customized further)
    const houlyRate = 2000; // Example rate
    const grossTotal = totalHours * houlyRate;
    const finalTotal = grossTotal - Number(deduction);

    const monthName = MONTH_NAMES[Number(selectedMonth)] || '';
    const periodLabel = `${monthName} ${selectedYear}`;
    const invoiceNo = `${String(selectedMonth).padStart(2, '0')}${selectedYear.slice(-2)}001`; // Automatic No

    const availableYears = useMemo(() => {
        const years = [...new Set((entries || []).map(e => new Date(e.work_date).getFullYear()))].sort((a, b) => b - a);
        if (years.length === 0) years.push(currentDate.getFullYear());
        return years;
    }, [entries]);

    async function exportPDF() {
        if (!selectedLecturer || filteredEntries.length === 0) {
            toast.error("No approved records found for this period");
            return;
        }
        try {
            const jspdfModule = await import('jspdf');
            const jsPDF = jspdfModule.default || jspdfModule.jsPDF;
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = autoTableModule.default;

            const doc = new jsPDF();

            // 1. Header
            doc.setFontSize(28);
            doc.setTextColor(51, 65, 85);
            doc.setFont('helvetica', 'bold');
            doc.text('INVOICE', 105, 30, { align: 'center' });

            // 2. Personal Info (Top Left)
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(lecturerInfo?.name || 'Name', 20, 50);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text([
                lecturerInfo?.address || 'Address',
                `Tel: ${lecturerInfo?.phone || 'Tel'}`,
                `Email: ${lecturerInfo?.email || 'Email'}`
            ], 20, 58);

            // 3. Invoice Meta (Top Right)
            doc.setFont('helvetica', 'bold');
            doc.text(`Invoice No :`, 140, 58);
            doc.text(`Date :`, 140, 72);

            doc.setFont('helvetica', 'normal');
            doc.text(invoiceNo, 175, 58);
            doc.text(new Date().toLocaleDateString(), 175, 72);

            // 4. Client Info (Middle Left)
            doc.setFont('helvetica', 'bold');
            doc.text('Unicom TIC', 20, 95);
            doc.setFont('helvetica', 'normal');
            doc.text([
                'unicomtic, MPCS Building,',
                '127 kks road jaffna',
                '',
                'unicomtic@gmail.com'
            ], 20, 102);

            // 5. Table Data (MATCH ROLE)
            let head = [];
            let body = [];

            if (isLecturerRole) {
                head = [['Quantity', 'Description', 'Unit Price', 'Total - LKR']];
                body = [[
                    `${totalHours.toFixed(2)} Hrs`,
                    `Consultation and development services for the month of ${monthName} ${selectedYear}`,
                    houlyRate.toLocaleString(),
                    grossTotal.toLocaleString()
                ]];
            } else {
                head = [['Description', 'Total - LKR']];
                body = [[
                    `Consultation and development services for the month of ${monthName} ${selectedYear}`,
                    grossTotal.toLocaleString()
                ]];
            }

            // 6. Draw Table
            autoTable(doc, {
                startY: 125,
                head: head,
                body: body,
                theme: 'plain',
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineWidth: 0.5,
                    lineColor: [0, 0, 0]
                },
                bodyStyles: {
                    textColor: [0, 0, 0],
                    lineWidth: 0.1,
                    lineColor: [200, 200, 200]
                },
                columnStyles: isLecturerRole ? {
                    0: { cellWidth: 30 },
                    2: { cellWidth: 40, halign: 'right' },
                    3: { cellWidth: 40, halign: 'right' }
                } : {
                    1: { cellWidth: 50, halign: 'right' }
                }
            });

            const finalY = doc.lastAutoTable.finalY + 10;

            // 7. Bank Account Details (Bottom Left)
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Bank Account Details', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.text([
                `Account Name: ${lecturerInfo?.account_name || '-'}`,
                `Bank Name: ${lecturerInfo?.bank_name || '-'}`,
                `Account No : ${lecturerInfo?.account_no || '-'}`,
                `Branch : ${lecturerInfo?.branch || '-'}`
            ], 20, finalY + 8);

            // 8. Totals (Bottom Right)
            const rightColX = 140;
            doc.text('Subtotal', rightColX, finalY);
            doc.text('Tax', rightColX, finalY + 10);
            doc.setFont('helvetica', 'bold');
            doc.text('GROSS TOTAL', rightColX, finalY + 25);

            // Total Value Box
            doc.rect(165, finalY + 15, 30, 15);
            doc.text(finalTotal.toLocaleString(), 180, finalY + 25, { align: 'center' });

            if (deduction > 0) {
                doc.setFontSize(8);
                doc.setTextColor(239, 68, 68);
                doc.text(`(Includes deduction: -${deduction.toLocaleString()})`, 180, finalY + 34, { align: 'center' });
            }

            // 9. Signature
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text('Signature', 20, finalY + 65);

            doc.save(`Invoice_${lecturerInfo?.name?.[0] || 'staff'}_${monthName}_${selectedYear}.pdf`);
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
                        <label>Member Name *</label>
                        <select
                            value={selectedLecturer}
                            onChange={e => setSelectedLecturer(e.target.value)}
                            style={{ width: '100%' }}
                            disabled={!isAdmin}
                        >
                            <option value="">— Select Member —</option>
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
                    {isStaffRole && (
                        <div>
                            <label>Deductions (LKR)</label>
                            <input
                                type="number"
                                value={deduction}
                                onChange={e => setDeduction(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Preview */}
            {!selectedLecturer ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                    <p>Select a member to preview their invoice</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                    <p>No approved entries for {lecturerInfo?.name} in {periodLabel}</p>
                </div>
            ) : (
                <div className="glass-card animate-fade-in-scale" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto', background: 'white', color: 'black' }}>
                    {/* Invoice Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: '#334155' }}>INVOICE</h2>
                    </div>

                    {/* Details Row */}
                    <div className="flex justify-between mb-12">
                        <div>
                            <h3 className="font-bold text-lg">{lecturerInfo?.name}</h3>
                            <p className="text-sm opacity-70">{lecturerInfo?.address || 'Address not set'}</p>
                            <p className="text-sm opacity-70">Tel: {lecturerInfo?.phone || '-'}</p>
                            <p className="text-sm opacity-70">Email: {lecturerInfo?.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm"><strong>Invoice No :</strong> {invoiceNo}</p>
                            <p className="text-sm"><strong>Date :</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="mb-8">
                        <h4 className="font-bold">Unicom TIC</h4>
                        <p className="text-sm opacity-70">unicomtic, MPCS Building,</p>
                        <p className="text-sm opacity-70">127 kks road jaffna</p>
                        <p className="text-sm opacity-70">unicomtic@gmail.com</p>
                    </div>

                    {/* Table */}
                    <div className="border-t border-b border-black py-4 mb-4">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid black' }}>
                                    {isLecturerRole && <th style={{ textAlign: 'left', padding: '8px' }}>Quantity</th>}
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                                    {isLecturerRole && <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price</th>}
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Total - LKR</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {isLecturerRole && <td style={{ padding: '8px' }}>{totalHours.toFixed(2)} Hrs</td>}
                                    <td style={{ padding: '8px' }}>
                                        Consultation and development services for the month of {monthName} {selectedYear}
                                    </td>
                                    {isLecturerRole && <td style={{ textAlign: 'right', padding: '8px' }}>{houlyRate.toLocaleString()}</td>}
                                    <td style={{ textAlign: 'right', padding: '8px' }}>{grossTotal.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Lower Section */}
                    <div className="flex justify-between gap-8">
                        <div>
                            <h4 className="font-bold text-sm mb-2">Bank Account Details</h4>
                            <p className="text-xs">Account Name: {lecturerInfo?.account_name || '-'}</p>
                            <p className="text-xs">Bank Name: {lecturerInfo?.bank_name || '-'}</p>
                            <p className="text-xs">Account No: {lecturerInfo?.account_no || '-'}</p>
                            <p className="text-xs">Branch: {lecturerInfo?.branch || '-'}</p>
                        </div>
                        <div style={{ minWidth: '200px' }}>
                            <div className="flex justify-between py-1 text-sm border-b">
                                <span>Subtotal</span>
                                <span>{grossTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 text-sm border-b">
                                <span>Tax</span>
                                <span>0.00</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold text-lg">
                                <span>GROSS TOTAL</span>
                                <span style={{ padding: '0.5rem', border: '1px solid black', minWidth: '100px', textAlign: 'right' }}>
                                    {finalTotal.toLocaleString()}
                                </span>
                            </div>
                            {deduction > 0 && (
                                <p className="text-xs text-right text-red-500 italic mt-1">
                                    Includes deduction: -{Number(deduction).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-16 pt-8 border-t border-transparent">
                        <p className="font-bold">Signature</p>
                    </div>

                    {/* Real Export Buttons */}
                    <div className="mt-8 pt-4 border-t border-gray-200 flex gap-4 justify-center" style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '1rem' }}>
                        <button onClick={exportPDF} className="btn btn-primary">
                            📄 Download PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
