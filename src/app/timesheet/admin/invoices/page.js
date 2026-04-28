"use client";

import { useEffect, useState } from "react";
import { approveInvoice, updateInvoiceData } from "@/app/actions/invoiceActions";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminInvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [deductionsMap, setDeductionsMap] = useState({});
    const [baseAmtMap, setBaseAmtMap] = useState({});

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
            (data || []).forEach(inv => {
                dMap[inv.id] = inv.deductions || 0;
                bMap[inv.id] = inv.amount || 0;
            });
            setDeductionsMap(dMap);
            setBaseAmtMap(bMap);
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
            doc.text([
                `Email: ${staff.staff_email || staff.email}`,
                `Invoice No: INV-${String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}`,
                `Date: 15/${String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}/${inv.year}`,
                `Period: ${inv.month} ${inv.year}`
            ], 20, 58);

            // Client Info (Right)
            doc.text([
                'Unicom TIC',
                'MPCS Building, 127 KKS Road',
                'Jaffna',
                'unicomtic@gmail.com'
            ], 140, 50);

            // Table
            autoTable(doc, {
                startY: 85,
                head: [['Quantity', 'Description', 'Unit Price', 'Total - LKR']],
                body: [[
                    inv.invoiceType === 'fixed' ? '1.00 Unit' : `${(inv.invoice_data?.totalHours || 0).toFixed(2)} Hrs`,
                    inv.invoice_data?.description || `Consultation and development services for the month of ${inv.month} ${inv.year}`,
                    (inv.invoice_data?.hourlyRate || 0).toLocaleString(),
                    currentBase.toLocaleString()
                ]],
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
                columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } }
            });

            const finalY = doc.lastAutoTable.finalY + 15;

            // Bank
            doc.setFont('helvetica', 'bold');
            doc.text('Bank Details', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.text([
                `Account Name: ${staff.account_name || '-'}`,
                `Bank Name: ${staff.bank_name || '-'}`,
                `Account No: ${staff.account_no || '-'}`
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
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text('Lecturer Signature', 20, finalY + 45);

            if (staff.e_signature) {
                try {
                    doc.addImage(staff.e_signature, 'PNG', 20, finalY + 50, 40, 15);
                } catch (e) {
                    console.error("Signature Render Error:", e);
                }
            }

            if (isPreview) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                const fileName = `${staff.name} ${inv.month} INV-${String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}.pdf`;
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

    const handleRateChange = (val) => {
        const newRate = Number(val);
        const totalHours = selectedInvoice.invoice_data?.totalHours || 0;
        const newGross = totalHours * newRate;
        setSelectedInvoice(prev => ({
            ...prev,
            invoice_data: { ...prev.invoice_data, hourlyRate: newRate, calculatedGross: newGross }
        }));
        setBaseAmtMap(prev => ({ ...prev, [selectedInvoice.id]: newGross }));
    };

    const handleSaveCorrections = async () => {
        setIsSavingCorrections(true);
        try {
            const totalHours = editingItems.reduce((sum, item) => sum + Number(item.hours || 0), 0);
            const hourlyRate = selectedInvoice.invoice_data?.hourlyRate || 3000;
            const calculatedGross = totalHours * hourlyRate;

            const updatedData = {
                ...selectedInvoice.invoice_data,
                items: editingItems,
                totalHours,
                calculatedGross
            };

            const res = await updateInvoiceData(selectedInvoice.id, updatedData);
            if (res.success) {
                toast.success("Corrections saved successfully!");
                // Optimistically update lists and details
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

    const isFixedModal = selectedInvoice && (selectedInvoice.invoice_data?.totalHours === 0 || !selectedInvoice.invoice_data?.totalHours) && (!selectedInvoice.invoice_data?.items || selectedInvoice.invoice_data.items.length === 0);

    return (
        <div className="container mt-8 animate-fade-in">
            <div className="page-hero">
                <h2>📑 Invoice Approvals</h2>
                <p>Review staff invoices, apply final deductions, and authorize payments.</p>
            </div>

            {error && <div className="alert alert-danger mb-6">{error}</div>}

            <div className="glass-card mt-8">
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
                                invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td>
                                            <div className="font-bold">{inv.users?.name}</div>
                                            <div className="text-xs text-secondary">{inv.users?.staff_email || inv.users?.email}</div>
                                        </td>
                                        <td>{inv.month} {inv.year}</td>
                                        <td className="text-xs font-mono">INV-{String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}</td>
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

                                            {/* Quick Timesheet Preview (NEW) */}
                                            {inv.invoice_data?.items && inv.invoice_data.items.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-[10px] font-bold text-secondary uppercase mb-1">Preview</p>
                                                    <div className="text-[10px] text-secondary opacity-80 border-t border-card-border pt-1">
                                                        {inv.invoice_data.items.length} entries ({inv.invoice_data.totalHours?.toFixed(1) || 0} hrs)
                                                    </div>
                                                </div>
                                            )}
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
                                                    className="btn btn-secondary px-3 py-1 text-xs"
                                                    title="View Breakdown & Edit"
                                                >
                                                    🔍 Details
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
                                <h3 className="text-2xl font-bold">Invoice Details</h3>
                                <p className="text-sm text-secondary">{selectedInvoice.users?.name} — {selectedInvoice.month} {selectedInvoice.year}</p>
                            </div>
                            <button onClick={closeDetails} className="btn-close">×</button>
                        </div>

                        <div className={`grid ${isFixedModal ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2'} gap-8 mb-8`}>
                            {!isFixedModal && (
                                <div className="glass-card p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Calculated Stats</h4>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Total Approved Hours:</span>
                                            <span className="font-bold">{selectedInvoice.invoice_data?.totalHours?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Hourly Rate:</span>
                                            <div className="flex items-center gap-1">
                                                {selectedInvoice.status === 'pending' ? (
                                                    <input
                                                        type="number"
                                                        value={selectedInvoice.invoice_data?.hourlyRate || ''}
                                                        onChange={e => handleRateChange(e.target.value)}
                                                        className="bg-transparent border border-card-border rounded px-2 py-0.5 text-sm w-20 focus:border-primary text-right font-bold w-full"
                                                    />
                                                ) : (
                                                    <span className="font-bold">{selectedInvoice.invoice_data?.hourlyRate?.toLocaleString() || '3000'}</span>
                                                )}
                                                <span className="text-secondary text-xs">/ {selectedInvoice.invoice_data?.paymentUnit || 'hour'}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-card-border mt-2">
                                            <span className="text-sm">Calculated Base:</span>
                                            <span className="font-bold text-accent">LKR {(selectedInvoice.invoice_data?.totalHours * (selectedInvoice.invoice_data?.hourlyRate || 3000))?.toLocaleString() || '0'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
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
