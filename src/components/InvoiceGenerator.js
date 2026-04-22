"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { submitInvoice } from "@/app/actions/invoiceActions";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function InvoiceGenerator({ entries, lecturers, invoices = [], currentUserId, isAdmin: initialIsAdmin }) {
    const { data: session } = useSession();
    const currentDate = new Date();
    const [selectedLecturer, setSelectedLecturer] = useState(initialIsAdmin ? '' : (currentUserId || ''));
    const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
    const [deduction, setDeduction] = useState(0);
    const [manualAmount, setManualAmount] = useState(0);
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const lecturerMap = useMemo(() => {
        const m = {};
        (lecturers || []).forEach(l => { m[l.id] = l; });
        return m;
    }, [lecturers]);

    const lecturerInfo = lecturerMap[selectedLecturer];
    const userRoles = lecturerInfo?.roles || [lecturerInfo?.role] || [];
    const isLecturerRole = userRoles.includes('lecturer');
    const isStaffRole = userRoles.includes('incubator_staff');
    const initialIsAdminAccount = userRoles.some(r => ['admin', 'administrator'].includes(r));

    // Pure staff mode = has staff role but NOT lecturer and NOT admin
    const isPureStaffRole = isStaffRole && !isLecturerRole && !initialIsAdminAccount;

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

    // Salary calculation
    const houlyRate = 3000;
    const calculatedGross = totalHours * houlyRate;

    // Use manual salary for pure staff, otherwise use calculated total
    const grossTotal = isPureStaffRole ? Number(manualAmount) : calculatedGross;
    const finalTotal = grossTotal - Number(deduction);

    const monthName = MONTH_NAMES[Number(selectedMonth)] || '';
    const periodLabel = `${monthName} ${selectedYear}`;
    const invoiceNo = String(selectedMonth).padStart(2, '0');

    const availableYears = useMemo(() => {
        const years = [...new Set((entries || []).map(e => new Date(e.work_date).getFullYear()))].sort((a, b) => b - a);
        if (years.length === 0) years.push(currentDate.getFullYear());
        return years;
    }, [entries]);

    const existingInvoice = useMemo(() => {
        return invoices.find(inv =>
            inv.month === monthName &&
            inv.year === selectedYear &&
            (initialIsAdmin ? inv.user_id === selectedLecturer : true)
        );
    }, [invoices, monthName, selectedYear, selectedLecturer, initialIsAdmin]);

    const handleSubmitInvoice = async () => {
        setSubmissionLoading(true);
        const res = await submitInvoice({
            invoice_no: invoiceNo,
            month: monthName,
            year: selectedYear,
            amount: finalTotal,
            deductions: deduction,
            houlyRate,
            totalHours,
            items: filteredEntries,
            lecturerName: lecturerInfo?.name,
            lecturerEmail: lecturerInfo?.staff_email || lecturerInfo?.email
        });

        if (res.success) {
            toast.success("Invoice submitted for approval!");
            setIsSubmitted(true);
        } else {
            toast.error(res.error || "Failed to submit invoice");
        }
        setSubmissionLoading(false);
    };

    async function exportPDF() {
        if (!selectedLecturer || (!isPureStaffRole && filteredEntries.length === 0)) {
            toast.error(isPureStaffRole ? "Select a staff member first" : "No approved records found for this period");
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
                `Email: ${lecturerInfo?.staff_email || lecturerInfo?.email || 'Email'}`
            ], 20, 58);

            // 3. Invoice Meta (Top Right)
            doc.setFont('helvetica', 'bold');
            doc.text(`Invoice No :`, 140, 58);
            doc.text(`Date :`, 140, 72);

            doc.setFont('helvetica', 'normal');
            doc.text(invoiceNo, 175, 58);
            doc.text(`15/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`, 175, 72);

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

            if (!isPureStaffRole) {
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
                    `Professional service fees for the month of ${monthName} ${selectedYear}`,
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
                columnStyles: !isPureStaffRole ? {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 35, halign: 'right' },
                    3: { cellWidth: 35, halign: 'right' }
                } : {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 40, halign: 'right' }
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
            const valueX = 195;
            doc.text('Subtotal', rightColX, finalY);
            doc.text(grossTotal.toLocaleString(), valueX, finalY, { align: 'right' });

            doc.text('Deduction', rightColX, finalY + 10);
            doc.text(`-${Number(deduction).toLocaleString()}`, valueX, finalY + 10, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.text('GROSS TOTAL', rightColX, finalY + 25);
            doc.text(finalTotal.toLocaleString(), valueX, finalY + 25, { align: 'right' });

            if (deduction > 0) {
                doc.setFontSize(8);
                doc.setTextColor(239, 68, 68);
                doc.text(`(Includes deduction: -${deduction.toLocaleString()})`, 180, finalY + 34, { align: 'center' });
            }

            // 9. Signature
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text('Signature', 20, finalY + 45);

            if (lecturerInfo?.e_signature) {
                try {
                    doc.addImage(lecturerInfo.e_signature, 'PNG', 20, finalY + 50, 40, 15);
                } catch (e) {
                    console.error("Signature Render Error:", e);
                }
            }

            doc.save(`Invoice_${lecturerInfo?.name?.[0] || 'staff'}_${monthName}_${selectedYear}.pdf`);
            toast.success('📄 PDF downloaded!');
        } catch (err) {
            console.error("PDF Gen Error:", err);
            toast.error(`PDF Error: ${err.message || 'Check console'}`);
        }
    }

    async function exportWord() {
        if (!selectedLecturer || (!isPureStaffRole && filteredEntries.length === 0)) {
            toast.error(isPureStaffRole ? "Select a staff member first" : "Select a lecturer with approved entries first");
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

            const tableRows = !isPureStaffRole ? [
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
            ] : [
                new TableRow({
                    tableHeader: true,
                    children: ['Description', 'Total - LKR'].map(h =>
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })], alignment: h === 'Description' ? AlignmentType.LEFT : AlignmentType.RIGHT })],
                            shading: { fill: '6366F1' },
                            borders: headerBorder,
                        })
                    ),
                }),
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: `Professional service fees for the month of ${monthName} ${selectedYear}`, size: 18 })] })],
                            borders: headerBorder,
                        }),
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: grossTotal.toLocaleString(), bold: true, size: 18 })], alignment: AlignmentType.RIGHT })],
                            borders: headerBorder,
                        }),
                    ],
                })
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
                            disabled={!initialIsAdmin}
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
                    {/* Deductions and Salary hidden as per user request (Admin handles this during review) */}
                </div>
            </div>

            {/* Invoice Preview */}
            {!selectedLecturer ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                    <p>Select a member to preview their invoice</p>
                </div>
            ) : (!isPureStaffRole && filteredEntries.length === 0) ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                    <p>No approved entries for {lecturerInfo?.name} in {periodLabel}</p>
                </div>
            ) : (
                <div className="glass-card animate-fade-in-scale" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto', background: 'white', color: 'black' }}>
                    {/* Status Bar (Only if submitted) */}
                    {existingInvoice && (
                        <div className={`mb-10 p-5 rounded-2xl flex items-center justify-between border-2 animate-fade-in ${existingInvoice.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`} style={{
                                backgroundColor: existingInvoice.status === 'approved' ? '#ecfdf5' : '#fffbeb',
                                borderColor: existingInvoice.status === 'approved' ? '#a7f3d0' : '#fde68a'
                            }}>
                            <div className="flex items-center gap-4">
                                <span style={{ fontSize: '1.5rem' }}>{existingInvoice.status === 'approved' ? '✅' : '⏳'}</span>
                                <div>
                                    <p className="font-bold uppercase tracking-widest text-[10px]">
                                        Status: {existingInvoice.status}
                                    </p>
                                    <p className="text-sm font-medium opacity-90">
                                        {existingInvoice.status === 'approved'
                                            ? "Administrator has authorized this invoice."
                                            : "This invoice is currently pending review."
                                        }
                                    </p>
                                </div>
                            </div>
                            {existingInvoice.status === 'approved' && (
                                <div className="text-right border-l border-emerald-200 pl-6">
                                    <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider">Authorized Final Total</p>
                                    <p className="text-2xl font-black tracking-tight">LKR {existingInvoice.amount?.toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    )}

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
                            <p className="text-sm"><strong>Date :</strong> 15/${String(selectedMonth).padStart(2, '0')}/${selectedYear}</p>
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
                                    {!isPureStaffRole && <th style={{ textAlign: 'left', padding: '8px' }}>Quantity</th>}
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                                    {!isPureStaffRole && <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price</th>}
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Total - LKR</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {!isPureStaffRole && <td style={{ padding: '8px' }}>{totalHours.toFixed(2)} Hrs</td>}
                                    <td style={{ padding: '8px' }}>
                                        {isPureStaffRole ? `Professional service fees for the month of ${monthName} ${selectedYear}` : `Consultation and development services for the month of ${monthName} ${selectedYear}`}
                                    </td>
                                    {!isPureStaffRole && <td style={{ textAlign: 'right', padding: '8px' }}>{houlyRate.toLocaleString()}</td>}
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
                        <div style={{ minWidth: '220px' }}>
                            <div className="flex justify-between py-1 text-sm border-b border-black/10">
                                <span className="font-medium">Subtotal</span>
                                <span>{grossTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 text-sm border-b border-black/10">
                                <span className="font-medium">Deduction</span>
                                <span>-{Number(deduction).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-4 font-bold text-lg mt-2">
                                <span>GROSS TOTAL</span>
                                <span>{finalTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="mt-8 pt-8 border-t border-transparent">
                        <p className="font-bold mb-2">Signature</p>
                        {lecturerInfo?.e_signature && (
                            <img
                                src={lecturerInfo.e_signature}
                                alt="Staff Signature"
                                style={{ maxHeight: '60px', display: 'block' }}
                            />
                        )}
                    </div>

                    {/* Real Export Buttons */}
                    <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col items-center gap-4" style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '1rem' }}>
                        <div className="flex gap-4 justify-center">
                            <button onClick={exportPDF} className="btn btn-secondary">
                                📄 Download Draft PDF
                            </button>
                            {!isSubmitted ? (
                                <button
                                    onClick={handleSubmitInvoice}
                                    disabled={submissionLoading}
                                    className="btn btn-primary"
                                    style={{ background: 'var(--accent-color)' }}
                                >
                                    {submissionLoading ? "Submitting..." : "📤 Submit for Approval"}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-success font-bold px-6 py-2 rounded-full border-2 border-success bg-success/5 animate-fade-in">
                                    <span>✅ Submitted</span>
                                </div>
                            )}
                        </div>
                        {isSubmitted && (
                            <p className="text-xs text-secondary italic">
                                Your invoice is now pending review by the Administrator. You can still download the draft.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
