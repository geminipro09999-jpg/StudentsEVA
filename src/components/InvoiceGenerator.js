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
    const [manualRate, setManualRate] = useState('');
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [invoiceType, setInvoiceType] = useState('timesheet');

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

    const monthName = MONTH_NAMES[Number(selectedMonth)] || '';
    const periodLabel = `${monthName} ${selectedYear}`;
    const invoiceNo = `INV-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${(selectedLecturer || '').slice(0, 6).toUpperCase()}`;

    const existingInvoice = useMemo(() => {
        return invoices.find(inv =>
            inv.month === monthName &&
            inv.year === selectedYear &&
            (initialIsAdmin ? inv.user_id === selectedLecturer : true)
        );
    }, [invoices, monthName, selectedYear, selectedLecturer, initialIsAdmin]);

    // Prioritize snapshot values from the existing invoice if they exist
    const activeRate = existingInvoice?.invoice_data?.hourlyRate || Number(manualRate) || lecturerInfo?.hourly_rate || 3000;
    const currentUnit = existingInvoice?.invoice_data?.paymentUnit || lecturerInfo?.payment_unit || 'hour';

    const activeInvoiceType = existingInvoice?.invoice_data?.invoiceType || ((!isLecturerRole && isStaffRole) ? 'fixed' : ((!isStaffRole && isLecturerRole) ? 'timesheet' : invoiceType));
    const isFixedInvoice = activeInvoiceType === 'fixed';

    const rawFilteredEntries = useMemo(() => {
        return (entries || []).filter(e => {
            if (e.status !== 'approved') return false;
            // Only show entries for the selected person
            if (selectedLecturer && e.lecturer_id !== selectedLecturer) return false;
            if (e.work_date) {
                const [year, month] = e.work_date.split('-');
                if (selectedMonth && Number(month) !== Number(selectedMonth)) return false;
                if (selectedYear && Number(year) !== Number(selectedYear)) return false;
            }
            return true;
        }).sort((a, b) => new Date(a.work_date) - new Date(b.work_date));
    }, [entries, selectedLecturer, selectedMonth, selectedYear]);

    const filteredEntries = existingInvoice?.invoice_data?.items || rawFilteredEntries;
    const totalHours = filteredEntries.reduce((s, e) => s + Number(e.hours), 0);

    const calculatedGross = totalHours * activeRate;

    const availableYears = useMemo(() => {
        const years = [...new Set((entries || []).map(e => e.work_date ? Number(e.work_date.split('-')[0]) : null).filter(Boolean))].sort((a, b) => b - a);
        if (years.length === 0) years.push(currentDate.getFullYear());
        return years;
    }, [entries]);

    const grossTotal = existingInvoice ? Number(existingInvoice.amount || 0) : calculatedGross;
    const activeDeduction = existingInvoice ? Number(existingInvoice.deductions || 0) : Number(deduction);
    const finalTotal = grossTotal - activeDeduction;

    const handleLoadInvoice = (inv) => {
        const monthIndex = MONTH_NAMES.indexOf(inv.month);
        if (monthIndex > 0) setSelectedMonth(String(monthIndex));
        setSelectedYear(String(inv.year));
        if (initialIsAdmin && inv.user_id) setSelectedLecturer(inv.user_id);

        toast.success(`Loaded data for ${inv.month} ${inv.year}. Scroll down to preview/download.`);
    };

    const handleSubmitInvoice = async () => {
        setSubmissionLoading(true);
        const res = await submitInvoice({
            lecturer_id: selectedLecturer,
            invoice_no: invoiceNo,
            month: monthName,
            year: selectedYear,
            amount: finalTotal,
            deductions: activeDeduction,
            hourlyRate: activeRate,
            paymentUnit: currentUnit,
            totalHours,
            items: filteredEntries,
            lecturerName: lecturerInfo?.name,
            lecturerEmail: lecturerInfo?.staff_email || lecturerInfo?.email,
            invoiceType: activeInvoiceType
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
        if (!selectedLecturer) {
            toast.error("Select a staff member first");
            return;
        }
        if (!isFixedInvoice && filteredEntries.length === 0) {
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

            let headSummary = [];
            let bodySummary = [];

            if (!isFixedInvoice) {
                headSummary = [['Quantity', 'Description', 'Unit Price', 'Total - LKR']];
                bodySummary = [[
                    `${totalHours.toFixed(2)} ${currentUnit === 'hour' ? 'Hrs' : 'Units'}`,
                    `Consultation and development services for the month of ${monthName} ${selectedYear}`,
                    activeRate.toLocaleString(),
                    grossTotal.toLocaleString()
                ]];
            } else {
                headSummary = [['Description', 'Total - LKR']];
                bodySummary = [[
                    `Professional service fees for the month of ${monthName} ${selectedYear}`,
                    grossTotal.toLocaleString()
                ]];
            }

            autoTable(doc, {
                startY: 125,
                head: headSummary,
                body: bodySummary,
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, lineColor: [0, 0, 0] },
                bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [200, 200, 200] },
                columnStyles: !isFixedInvoice ? { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } } : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } }
            });

            const finalY = doc.lastAutoTable.finalY + 15;

            // 7. Bank Account Details (Bottom Left)
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Bank Details', 20, finalY);
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
            doc.text(`-${Number(activeDeduction).toLocaleString()}`, valueX, finalY + 10, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.text('GROSS TOTAL', rightColX, finalY + 25);
            doc.text(finalTotal.toLocaleString(), valueX, finalY + 25, { align: 'right' });

            if (activeDeduction > 0) {
                doc.setFontSize(8);
                doc.setTextColor(239, 68, 68);
                doc.text(`(Includes deduction: -${activeDeduction.toLocaleString()})`, 180, finalY + 34, { align: 'center' });
            }

            // 9. Signatures
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text('Lecturer Signature', 20, finalY + 45);

            if (lecturerInfo?.e_signature) {
                try {
                    doc.addImage(lecturerInfo.e_signature, 'PNG', 20, finalY + 50, 40, 15);
                } catch (e) {
                    console.error("Signature Render Error:", e);
                }
            }

            const fileName = `${lecturerInfo?.name || 'Invoice'} ${monthName} ${String(selectedMonth).padStart(2, '0')}.pdf`;
            doc.save(fileName);
            toast.success('📄 PDF downloaded!');
        } catch (err) {
            console.error("PDF Gen Error:", err);
            toast.error(`PDF Error: ${err.message || 'Check console'}`);
        }
    }

    async function exportWord() {
        if (!selectedLecturer) {
            toast.error("Select a member first");
            return;
        }
        if (!isFixedInvoice && filteredEntries.length === 0) {
            toast.error("No approved records found for this period");
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

            const tableRows = !isFixedInvoice ? [
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
                        new Paragraph({ text: '', spacing: { before: 200 } }),
                        new Paragraph({ children: [new TextRun({ text: `Payment Rate: ${activeRate.toLocaleString()} LKR per ${currentUnit}`, bold: true, size: 18 })] }),
                        new Paragraph({ text: '', spacing: { before: 400 } }),
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
            a.download = `${lecturerInfo?.name || 'Invoice'} ${monthName} ${String(selectedMonth).padStart(2, '0')}.docx`;
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
            {/* Payment History Table */}
            <div className="mt-4 mb-12">
                <div className="page-hero" style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: 'none' }}>
                    <h3 className="text-xl font-bold">📂 Payment History</h3>
                    <p>Select a past approved invoice to download its official document</p>
                </div>
                <div className="glass-card animate-fade-in">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Inv No</th>
                                    <th>Amount (LKR)</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!invoices || invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-6 text-secondary">No payment history found.</td>
                                    </tr>
                                ) : (
                                    invoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-semibold">{inv.month} {inv.year}</td>
                                            <td className="text-xs font-mono">{inv.invoice_no || String(inv.month_no || 0).padStart(2, '0')}</td>
                                            <td className="font-bold">{(inv.amount || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${inv.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                                                    {inv.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleLoadInvoice(inv)}
                                                    className="btn btn-secondary px-3 py-1 text-xs"
                                                >
                                                    {inv.status === 'approved' ? '📄 View / Download' : '🔍 View Draft'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
                    {initialIsAdmin ? (
                        <div>
                            <label>Rate per Hour (LKR) *</label>
                            <input
                                type="number"
                                value={manualRate}
                                onChange={e => setManualRate(e.target.value)}
                                placeholder={`Default: ${lecturerInfo?.hourly_rate || 3000}`}
                                style={{ width: '100%' }}
                                className="bg-transparent border border-card-border rounded px-2 py-1 focus:border-primary transition-colors"
                            />
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-secondary font-semibold">Rate: {activeRate.toLocaleString()} / {currentUnit}</p>
                        </div>
                    )}
                    {isLecturerRole && isStaffRole && (
                        <div>
                            <label>Invoice Type</label>
                            <select value={invoiceType} onChange={e => setInvoiceType(e.target.value)} style={{ width: '100%' }}>
                                <option value="timesheet">Timesheet (Hourly/Unit)</option>
                                <option value="fixed">Fixed Monthly Salary</option>
                            </select>
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
            ) : (!isFixedInvoice && filteredEntries.length === 0) ? (
                <div className="glass-card text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                    <p>No approved entries for {lecturerInfo?.name} in {periodLabel}</p>
                </div>
            ) : (
                <div className="glass-card animate-fade-in-scale" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto', background: 'white', color: 'black', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
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

                    {/* Summary Table */}
                    <div className="border-t border-black pt-4 mb-4">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid black' }}>
                                    {!isFixedInvoice && <th style={{ textAlign: 'left', padding: '8px' }}>Quantity</th>}
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                                    {!isFixedInvoice && <th style={{ textAlign: 'right', padding: '8px' }}>Unit Price</th>}
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Total - LKR</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {!isFixedInvoice && <td style={{ padding: '8px' }}>{totalHours.toFixed(2)} {currentUnit === 'hour' ? 'Hrs' : 'Units'}</td>}
                                    <td style={{ padding: '8px' }}>
                                        {isFixedInvoice ? `Professional service fees for the month of ${monthName} ${selectedYear}` : `Consultation and development services for the month of ${monthName} ${selectedYear}`}
                                    </td>
                                    {!isFixedInvoice && <td style={{ textAlign: 'right', padding: '8px' }}>{activeRate.toLocaleString()}</td>}
                                    <td style={{ textAlign: 'right', padding: '8px' }}>{grossTotal.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Timesheet Breakdown */}
                    {!isFixedInvoice && filteredEntries.length > 0 && (
                        <div className="border-b border-black pb-4 mb-8">
                            <h4 className="font-bold mb-3 text-sm">Timesheet Approvals</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={{ padding: '6px', textAlign: 'left' }}>Date</th>
                                        <th style={{ padding: '6px', textAlign: 'left' }}>In Time</th>
                                        <th style={{ padding: '6px', textAlign: 'left' }}>Out Time</th>
                                        <th style={{ padding: '6px', textAlign: 'right' }}>Hours</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEntries.map((entry, index) => (
                                        <tr key={index} style={{ borderBottom: index < filteredEntries.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                            <td style={{ padding: '6px' }}>{new Date(entry.work_date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '6px' }}>{entry.in_time?.slice(0, 5)}</td>
                                            <td style={{ padding: '6px' }}>{entry.out_time?.slice(0, 5)}</td>
                                            <td style={{ padding: '6px', textAlign: 'right' }}>{Number(entry.hours).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Lower Section */}
                    <div className="flex justify-between gap-8">
                        <div>
                            <h4 className="font-bold text-sm mb-2">Bank Details</h4>
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
                                <span>-{Number(activeDeduction).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-4 font-bold text-lg mt-2">
                                <span>GROSS TOTAL</span>
                                <span>{finalTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-8 pt-8 border-t border-transparent">
                        <p className="font-bold mb-2">Lecturer Signature</p>
                        {lecturerInfo?.e_signature ? (
                            <img
                                src={lecturerInfo.e_signature}
                                alt="Staff Signature"
                                style={{ maxHeight: '60px', display: 'block' }}
                            />
                        ) : (
                            <div style={{ height: '60px' }}></div>
                        )}
                    </div>

                    {/* Real Export Buttons */}
                    <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col items-center gap-4 no-print" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem' }}>
                        {existingInvoice?.status === 'approved' ? (
                            <div className="flex gap-4 justify-center w-full">
                                <button onClick={exportPDF} className="btn btn-primary" style={{ background: '#10b981', color: 'white', borderColor: '#059669' }}>
                                    📄 Download Official PDF
                                </button>
                                <button onClick={exportWord} className="btn btn-secondary bg-blue-50 text-blue-700 border-blue-200">
                                    📝 Download Word Document
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 justify-center w-full">
                                {(!isSubmitted && !existingInvoice) ? (
                                    <button
                                        onClick={handleSubmitInvoice}
                                        disabled={submissionLoading}
                                        className="btn btn-primary w-full max-w-xs"
                                        style={{ background: 'var(--accent-color)' }}
                                    >
                                        {submissionLoading ? "Submitting..." : "📤 Submit for Approval"}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-600 font-bold px-6 py-2 rounded-full border-2 border-amber-400 bg-amber-50 animate-fade-in">
                                        <span>⏳ Pending Admin Approval</span>
                                    </div>
                                )}
                                <p className="text-xs text-secondary italic text-center mt-2">
                                    {(!isSubmitted && !existingInvoice) ?
                                        "You must submit this invoice to the Administrator for approval before generation." :
                                        "The official invoice will be available to download once the Administrator approves it."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
