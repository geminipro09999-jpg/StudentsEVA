"use client";

import { useEffect, useState } from "react";
import { approveInvoice, updateInvoiceData } from "@/app/actions/invoiceActions";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminInvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [deductionsMap, setDeductionsMap] = useState({});
    const [baseAmtMap, setBaseAmtMap] = useState({});
    const [descriptionsMap, setDescriptionsMap] = useState({});
    const [ratesMap, setRatesMap] = useState({});
    const [invoiceNosMap, setInvoiceNosMap] = useState({});
    const [datesMap, setDatesMap] = useState({});
    const [paymentBasisFilter, setPaymentBasisFilter] = useState("all");

    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        const roles = session?.user?.roles || [];
        const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r)) ||
            ['admin', 'administrator'].includes(session?.user?.role);

        if (!session || !isAdmin) {
            router.push("/dashboard");
            return;
        }
        fetchInvoices();
    }, [session, status]);

    async function fetchInvoices() {
        setLoading(true);
        setError("");
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, users(name, email, staff_email, address, phone, account_name, bank_name, account_no, branch, e_signature)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setInvoices(data || []);
            const dMap = {};
            const bMap = {};
            const descMap = {};
            const rMap = {};
            const nMap = {};
            const dateMap = {};
            (data || []).forEach(inv => {
                dMap[inv.id] = inv.deductions || 0;
                bMap[inv.id] = inv.amount || 0;
                descMap[inv.id] = inv.invoice_data?.description || "";
                rMap[inv.id] = inv.invoice_data?.activeRate || inv.invoice_data?.hourlyRate || 0;
                nMap[inv.id] = inv.invoice_data?.displayInvoiceNo || String(MONTH_NAMES.indexOf(inv.month)).padStart(4, '0');
                dateMap[inv.id] = inv.invoice_data?.displayDate || `15/${String(MONTH_NAMES.indexOf(inv.month)).padStart(2, '0')}/${inv.year}`;
            });
            setDeductionsMap(dMap);
            setBaseAmtMap(bMap);
            setDescriptionsMap(descMap);
            setRatesMap(rMap);
            setInvoiceNosMap(nMap);
            setDatesMap(dateMap);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }

    const handleApprove = async (invoiceId) => {
        setUpdatingId(invoiceId);
        const res = await approveInvoice(invoiceId, {
            status: 'approved',
            amount: Number(baseAmtMap[invoiceId] || 0),
            deductions: Number(deductionsMap[invoiceId] || 0)
        });

        if (res.success) {
            toast.success("Invoice approved!");
            fetchInvoices();
        } else {
            toast.error(res.error || "Failed to approve invoice");
        }
        setUpdatingId(null);
    };

    const handleReject = async (invoiceId) => {
        setUpdatingId(invoiceId);
        const res = await approveInvoice(invoiceId, {
            status: 'rejected',
            amount: Number(baseAmtMap[invoiceId] || 0),
            deductions: 0
        });

        if (res.success) {
            toast.success("Invoice rejected");
            fetchInvoices();
        } else {
            toast.error(res.error || "Failed to reject invoice");
        }
        setUpdatingId(null);
    };

    const handleDeductionChange = (id, val) => {
        setDeductionsMap(prev => ({ ...prev, [id]: val }));
    };

    const handleBaseAmtChange = (id, val) => {
        setBaseAmtMap(prev => ({ ...prev, [id]: val }));
    };

    const exportPDF = (inv, isPreview = false) => {
        try {
            const doc = new jsPDF();
            const currentBase = Number(baseAmtMap[inv.id] || 0);
            const currentDeduction = Number(deductionsMap[inv.id] || 0);
            const finalTotal = currentBase - currentDeduction;
            const staff = inv.users;

            // Header
            doc.setFontSize(28);
            doc.setTextColor(51, 65, 85);
            doc.setFont('helvetica', 'bold');
            doc.text('INVOICE', 105, 30, { align: 'center' });
            doc.setTextColor(0, 0, 0);

            // Staff & Client Info
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(staff.name || 'Staff Member', 20, 50);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const displayInvNo = invoiceNosMap[inv.id] || String(inv.month_no || MONTH_NAMES.indexOf(inv.month)).padStart(4, '0');
            const displayDate = datesMap[inv.id] || `15/${String(inv.month_no || MONTH_NAMES.indexOf(inv.month)).padStart(2, '0')}/${inv.year}`;

            doc.text([
                `Email: ${staff.staff_email || staff.email}`,
                `Invoice No: ${displayInvNo}`,
                `Date: ${displayDate}`
            ], 20, 58);

            // Client Info (Right)
            doc.text([
                'Unicom TIC',
                'MPCS Building, 127 KKS Road',
                'Jaffna',
                'unicomtic@gmail.com'
            ], 140, 50);

            const basis = inv.invoice_data?.paymentBasis || (inv.invoice_data?.invoiceType === 'fixed' ? 'monthly' : 'hourly');
            const isMonthly = basis === 'monthly';
            const unitLabel = basis === 'hourly' ? 'Hrs' : (basis === 'unit' ? 'Units' : 'Month');
            const displayUnit = basis === 'monthly' ? '1' : (basis === 'hourly' ? (inv.invoice_data?.totalHours || 0).toFixed(2) : (inv.invoice_data?.totalUnits || 0));

            const currentDescription = descriptionsMap[inv.id] || inv.invoice_data?.description || `consultation and development services for the month of ${inv.month} ${inv.year}`;

            const head = isMonthly ? [['Description', 'Total - LKR']] : [['Description', 'Unit', 'Rate per Unit', 'Total - LKR']];
            const body = isMonthly 
                ? [[currentDescription, currentBase.toLocaleString()]]
                : [[
                    currentDescription,
                    `${displayUnit} ${unitLabel}`,
                    (ratesMap[inv.id] || inv.invoice_data?.activeRate || inv.invoice_data?.hourlyRate || 0).toLocaleString(),
                    currentBase.toLocaleString()
                ]];

            // Table
            autoTable(doc, {
                startY: 85,
                head: head,
                body: body,
                theme: 'grid',
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
                columnStyles: isMonthly 
                    ? { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } }
                    : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } }
            });

            const finalY = doc.lastAutoTable.finalY + 15;

            // Bank
            doc.setFont('helvetica', 'bold');
            doc.text('Bank Details', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.text([
                `Account Name: ${staff.account_name || '-'}`,
                `Bank Name: ${staff.bank_name || '-'}`,
                `Account No: ${staff.account_no || '-'}`,
                `Branch: ${staff.branch || '-'}`
            ], 20, finalY + 8);

            // Summary
            doc.setFont('helvetica', 'normal');
            doc.text('Subtotal', 140, finalY);
            doc.text(currentBase.toLocaleString(), 195, finalY, { align: 'right' });

            doc.text('Deduction', 140, finalY + 10);
            doc.text(`-${currentDeduction.toLocaleString()}`, 195, finalY + 10, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            const rightColX = 140;
            doc.text('GROSS TOTAL', rightColX, finalY + 25);

            // Total Value
            doc.text(finalTotal.toLocaleString(), 195, finalY + 25, { align: 'right' });

            // Signatures
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Signature', 140, doc.internal.pageSize.height - 40);
            
            if (staff?.e_signature) {
                try {
                    doc.addImage(staff.e_signature, 'PNG', 140, doc.internal.pageSize.height - 35, 40, 20);
                } catch (e) {
                    console.error("Signature Render Error:", e);
                }
            }

            if (isPreview) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                const fileName = `${staff.name} ${inv.month} 00 ${String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}.pdf`;
                doc.save(fileName);
                toast.success("Final PDF generated!");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF");
        }
    };

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [editingItems, setEditingItems] = useState([]);
    const [isSavingCorrections, setIsSavingCorrections] = useState(false);

    const openDetails = (inv) => {
        setSelectedInvoice(inv);
        setEditingItems(JSON.parse(JSON.stringify(inv.invoice_data?.items || [])));
    };

    const closeDetails = () => {
        if (isSavingCorrections) return;
        setSelectedInvoice(null);
        setEditingItems([]);
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...editingItems];
        updated[index][field] = value;

        // Auto-recalculate hours if in_time or out_time changes
        if (field === 'in_time' || field === 'out_time') {
            const item = updated[index];
            if (item.in_time && item.out_time) {
                const [inH, inM] = item.in_time.split(':').map(Number);
                const [outH, outM] = item.out_time.split(':').map(Number);
                const start = new Date(0, 0, 0, inH, inM, 0);
                const end = new Date(0, 0, 0, outH, outM, 0);
                let diff = (end - start) / 3600000;
                if (diff < 0) diff += 24; // Cross midnight
                updated[index].hours = Math.round(diff * 100) / 100;
            }
        }
        setEditingItems(updated);
    };

    const handleRemoveItem = (index) => {
        setEditingItems(editingItems.filter((_, i) => i !== index));
    };

    const handleSaveCorrections = async () => {
        setIsSavingCorrections(true);
        try {
            const basis = selectedInvoice.invoice_data?.paymentBasis || (selectedInvoice.invoice_data?.invoiceType === 'fixed' ? 'monthly' : 'hourly');
            const totalHours = basis === 'hourly' ? editingItems.reduce((sum, item) => sum + Number(item.hours || 0), 0) : 0;
            const totalUnits = basis === 'unit' ? [...new Set(editingItems.map(e => e.work_date))].length : (basis === 'monthly' ? 1 : totalHours);
            const rate = Number(ratesMap[selectedInvoice.id] || 0);
            const calculatedGross = basis === 'monthly' ? rate : (totalUnits * rate);

            const updatedData = {
                ...selectedInvoice.invoice_data,
                description: descriptionsMap[selectedInvoice.id],
                items: (basis === 'monthly') ? [] : editingItems,
                totalHours: totalHours,
                totalUnits: totalUnits,
                activeRate: rate,
                calculatedGross
            };

            const res = await updateInvoiceData(selectedInvoice.id, updatedData);
            if (res.success) {
                toast.success("Corrections saved successfully!");
                setBaseAmtMap(prev => ({ ...prev, [selectedInvoice.id]: calculatedGross }));
                setSelectedInvoice(prev => ({
                    ...prev,
                    amount: calculatedGross,
                    invoice_data: updatedData
                }));
                const updatedInvoicesList = invoices.map(i => i.id === selectedInvoice.id ? { ...i, amount: calculatedGross, invoice_data: updatedData } : i);
                setInvoices(updatedInvoicesList);
                return true;
            } else {
                toast.error(res.error || "Failed to save corrections");
                return false;
            }
        } catch (e) {
            toast.error("An error occurred preserving corrections");
            return false;
        } finally {
            setIsSavingCorrections(false);
        }
    };

    if (loading) return <div className="container mt-8 text-center">Loading invoices...</div>;
    const basis = selectedInvoice?.invoice_data?.paymentBasis || (selectedInvoice?.invoice_data?.invoiceType === 'fixed' ? 'monthly' : 'hourly');
    const isFixedModal = basis === 'monthly';
    const isUnitModal = basis === 'unit';

    return (
        <div className="container mt-8 animate-fade-in">
            <div className="page-hero">
                <h2>📑 Invoice Approvals</h2>
                <p>Review staff invoices, apply final deductions, and authorize payments.</p>
            </div>

            {error && <div className="alert alert-danger mb-6">{error}</div>}

            <div className="flex flex-wrap gap-2 mb-6">
                <button 
                    onClick={() => setPaymentBasisFilter('all')} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${paymentBasisFilter === 'all' ? 'bg-primary text-white shadow-lg' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}`}
                >
                    ALL INVOICES
                </button>
                <button 
                    onClick={() => setPaymentBasisFilter('hourly')} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${paymentBasisFilter === 'hourly' ? 'bg-warning text-white shadow-lg' : 'bg-warning/10 text-warning hover:bg-warning/20'}`}
                >
                    HOURLY (Lecturer*)
                </button>
                <button 
                    onClick={() => setPaymentBasisFilter('unit')} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${paymentBasisFilter === 'unit' ? 'bg-accent text-white shadow-lg' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
                >
                    PER DAY (Lecturer)
                </button>
                <button 
                    onClick={() => setPaymentBasisFilter('monthly')} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${paymentBasisFilter === 'monthly' ? 'bg-success text-white shadow-lg' : 'bg-success/10 text-success hover:bg-success/20'}`}
                >
                    MONTHLY (Incubator)
                </button>
            </div>

            <div className="glass-card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Month/Year</th>
                                <th>Inv No</th>
                                <th>Base Amt</th>
                                <th>Deductions</th>
                                <th>Final Total</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-secondary">No invoices submitted for review yet.</td>
                                </tr>
                            ) : (
                                invoices.filter(inv => {
                                    const b = inv.invoice_data?.paymentBasis || (inv.invoice_data?.invoiceType === 'fixed' ? 'monthly' : 'hourly');
                                    if (paymentBasisFilter === 'all') return true;
                                    return b === paymentBasisFilter;
                                }).map(inv => (
                                    <tr key={inv.id}>
                                        <td>
                                            <div className="font-bold">{inv.users?.name}</div>
                                            <div className="text-xs text-secondary">{inv.users?.staff_email || inv.users?.email}</div>
                                        </td>
                                        <td>{inv.month} {inv.year}</td>
                                        <td className="text-xs font-mono">00 {String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}</td>
                                        <td>
                                            <input
                                                type="number"
                                                value={baseAmtMap[inv.id] || 0}
                                                onChange={(e) => handleBaseAmtChange(inv.id, e.target.value)}
                                                disabled={inv.status !== 'pending' || updatingId === inv.id}
                                                className="table-input"
                                                style={{ width: '120px', padding: '0.2rem 0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={deductionsMap[inv.id] || 0}
                                                onChange={(e) => handleDeductionChange(inv.id, e.target.value)}
                                                disabled={inv.status !== 'pending' || updatingId === inv.id}
                                                className="table-input"
                                                style={{ width: '100px', padding: '0.2rem 0.5rem', fontSize: '0.9rem' }}
                                            />
                                        </td>
                                        <td className="font-bold">
                                            LKR {((baseAmtMap[inv.id] || 0) - (deductionsMap[inv.id] || 0)).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${inv.status === 'approved' ? 'badge-success' : inv.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                                {inv.status.toUpperCase()}
                                            </span>
                                            <span className="badge badge-secondary ml-2" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-color)' }}>
                                                {(() => {
                                                    const basis = inv.invoice_data?.paymentBasis || (inv.invoice_data?.invoiceType === 'fixed' ? 'monthly' : 'hourly');
                                                    if (basis === 'hourly') return 'LECTURER *';
                                                    if (basis === 'unit') return 'PER DAY';
                                                    return basis.toUpperCase();
                                                })()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                {inv.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(inv.id)}
                                                            disabled={updatingId === inv.id}
                                                            className="btn btn-primary px-3 py-1 text-xs"
                                                            style={{ background: '#10b981' }}
                                                        >
                                                            {updatingId === inv.id ? "..." : "Approve"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(inv.id)}
                                                            disabled={updatingId === inv.id}
                                                            className="btn btn-secondary px-3 py-1 text-xs"
                                                            style={{ background: '#ef4444' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {(inv.status === 'approved' || inv.status === 'rejected') && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm("Are you sure you want to Re-Open this invoice? It will become 'Pending' again for edits.")) return;
                                                            setUpdatingId(inv.id);
                                                            const res = await approveInvoice(inv.id, {
                                                                status: 'pending',
                                                                amount: Number(baseAmtMap[inv.id] || 0),
                                                                deductions: Number(deductionsMap[inv.id] || 0)
                                                            });
                                                            if (res.success) {
                                                                toast.success("Invoice Re-Opened!");
                                                                fetchInvoices();
                                                            } else {
                                                                toast.error(res.error || "Failed to re-open invoice");
                                                            }
                                                            setUpdatingId(null);
                                                        }}
                                                        disabled={updatingId === inv.id}
                                                        className="btn btn-secondary px-3 py-1 text-xs text-amber-600 border-amber-200 bg-amber-50"
                                                        title="Change back to Pending"
                                                    >
                                                        ↻ Re-open
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openDetails(inv)}
                                                    className="btn btn-primary px-3 py-1 text-xs"
                                                    title="Edit & Download PDF"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => exportPDF(inv, true)}
                                                    className="btn btn-secondary px-3 py-1 text-xs"
                                                    title="Preview PDF in Browser"
                                                >
                                                    👁️ Preview
                                                </button>
                                                <button
                                                    onClick={() => exportPDF(inv, false)}
                                                    className="btn btn-secondary px-3 py-1 text-xs"
                                                    title="Download PDF"
                                                >
                                                    📄
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedInvoice && (
                <div className="modal-overlay animate-fade-in no-print">
                    <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '800px', width: '95%' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold">Edit Invoice Details</h3>
                                <p className="text-sm text-secondary">{selectedInvoice.users?.name} — {selectedInvoice.month} {selectedInvoice.year}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => exportPDF(selectedInvoice, true)} className="btn btn-secondary text-sm">👁️ Preview PDF</button>
                                <button onClick={() => exportPDF(selectedInvoice, false)} className="btn btn-primary text-sm">📄 Download PDF</button>
                                <button onClick={closeDetails} className="btn-close">×</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="glass-card p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Invoice Number</h4>
                                <input 
                                    type="text"
                                    className="w-full bg-transparent border border-card-border rounded px-3 py-2 text-sm focus:border-primary font-mono"
                                    value={invoiceNosMap[selectedInvoice.id] || ''}
                                    onChange={e => setInvoiceNosMap({...invoiceNosMap, [selectedInvoice.id]: e.target.value})}
                                />
                            </div>
                            <div className="glass-card p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Invoice Date</h4>
                                <input 
                                    type="text"
                                    className="w-full bg-transparent border border-card-border rounded px-3 py-2 text-sm focus:border-primary"
                                    value={datesMap[selectedInvoice.id] || ''}
                                    onChange={e => setDatesMap({...datesMap, [selectedInvoice.id]: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="glass-card p-4 mb-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Invoice Description</h4>
                            <textarea 
                                className="w-full bg-transparent border border-card-border rounded p-3 text-sm focus:border-primary min-h-[80px]"
                                value={descriptionsMap[selectedInvoice.id] || selectedInvoice.invoice_data?.description || `consultation and development services for the month of ${selectedInvoice.month} ${selectedInvoice.year}`}
                                onChange={e => setDescriptionsMap({...descriptionsMap, [selectedInvoice.id]: e.target.value})}
                                placeholder="Enter invoice description..."
                            />
                        </div>

                        <div className={`grid ${isFixedModal ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2'} gap-8 mb-8`}>
                            <div className="glass-card p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                                    {isFixedModal ? 'Salary Details' : 'Calculated Stats'}
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {!isFixedModal && (
                                        <div className="flex justify-between">
                                            <span className="text-sm">Total {isUnitModal ? 'Units' : 'Hours'}:</span>
                                            <span className="font-bold">{isUnitModal ? (selectedInvoice.invoice_data?.totalUnits || 0) : (selectedInvoice.invoice_data?.totalHours?.toFixed(2) || '0.00')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">{isFixedModal ? 'Monthly Salary:' : 'Hourly Rate:'}</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={ratesMap[selectedInvoice.id] || selectedInvoice.invoice_data?.activeRate || selectedInvoice.invoice_data?.hourlyRate || ''}
                                                onChange={e => setRatesMap({...ratesMap, [selectedInvoice.id]: e.target.value})}
                                                className="bg-transparent border border-card-border rounded px-2 py-0.5 text-sm w-24 focus:border-primary text-right font-bold"
                                            />
                                            <span className="text-secondary text-xs">/ {basis === 'monthly' ? 'month' : (basis === 'unit' ? 'unit' : 'hour')}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-card-border mt-2">
                                        <span className="text-sm">{isFixedModal ? 'Gross Total:' : 'Calculated Base:'}</span>
                                        <span className="font-bold text-accent">LKR {isFixedModal ? (selectedInvoice.invoice_data?.hourlyRate || 0).toLocaleString() : (selectedInvoice.invoice_data?.totalHours * (selectedInvoice.invoice_data?.hourlyRate || 3000))?.toLocaleString() || '0'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="glass-card p-4 border-accent/20 bg-accent/5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Authorized Payment</h4>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Final Base Amount:</span>
                                        <span className="font-bold">LKR {baseAmtMap[selectedInvoice.id]?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Deductions:</span>
                                        <span className="font-bold text-danger">-{deductionsMap[selectedInvoice.id]?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-card-border mt-2">
                                        <span className="text-lg">Net Payable:</span>
                                        <span className="text-lg font-black text-primary">LKR {(baseAmtMap[selectedInvoice.id] - deductionsMap[selectedInvoice.id])?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isFixedModal && (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold uppercase tracking-wider mb-0 text-primary">Timesheet Editor</h4>
                                    {selectedInvoice.status === 'pending' && (
                                        <button
                                            onClick={handleSaveCorrections}
                                            disabled={isSavingCorrections}
                                            className="btn btn-secondary px-3 py-1 text-xs flex items-center gap-2"
                                        >
                                            {isSavingCorrections ? "Saving..." : "💾 Save Corrections"}
                                        </button>
                                    )}
                                </div>
                                <div className="border border-card-border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto mb-4">
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary/5 sticky top-0 backdrop-blur z-10">
                                            <tr>
                                                <th className="p-3 text-left w-1/4">Date</th>
                                                <th className="p-3 text-left">Time In - Out</th>
                                                <th className="p-3 text-center w-24">Hours</th>
                                                <th className="p-3 text-center w-16">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-card-border">
                                            {editingItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-secondary/5 transition-colors group">
                                                    <td className="p-3 whitespace-nowrap">
                                                        <input
                                                            type="date"
                                                            value={item.work_date ? new Date(item.work_date).toISOString().split('T')[0] : ''}
                                                            onChange={e => handleItemChange(idx, 'work_date', e.target.value)}
                                                            disabled={selectedInvoice.status !== 'pending'}
                                                            className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-32 focus:border-primary disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="p-3 flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={item.in_time || ''}
                                                            onChange={e => handleItemChange(idx, 'in_time', e.target.value)}
                                                            disabled={selectedInvoice.status !== 'pending'}
                                                            className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-24 focus:border-primary disabled:opacity-50"
                                                        />
                                                        <span className="text-secondary">-</span>
                                                        <input
                                                            type="time"
                                                            value={item.out_time || ''}
                                                            onChange={e => handleItemChange(idx, 'out_time', e.target.value)}
                                                            disabled={selectedInvoice.status !== 'pending'}
                                                            className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-24 focus:border-primary disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={item.hours || 0}
                                                            onChange={e => handleItemChange(idx, 'hours', e.target.value)}
                                                            disabled={selectedInvoice.status !== 'pending'}
                                                            className="bg-transparent border border-card-border rounded px-2 py-1 text-xs w-16 text-center font-bold focus:border-primary mx-auto block disabled:opacity-50 text-accent"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {selectedInvoice.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleRemoveItem(idx)}
                                                                className="text-danger/50 hover:text-danger p-1 rounded hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Remove Entry"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {editingItems.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-secondary">No breakdown items available.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-card-border">
                            <button onClick={closeDetails} className="btn btn-secondary">Close Window</button>
                            {selectedInvoice.status === 'pending' && (
                                <button
                                    onClick={async () => {
                                        const saved = await handleSaveCorrections();
                                        if (saved !== false) {
                                            handleApprove(selectedInvoice.id);
                                            closeDetails();
                                        }
                                    }}
                                    className="btn btn-primary"
                                    style={{ background: '#10b981' }}
                                    disabled={isSavingCorrections || updatingId === selectedInvoice.id}
                                >
                                    {isSavingCorrections ? "Saving..." : "Approve & Close"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
