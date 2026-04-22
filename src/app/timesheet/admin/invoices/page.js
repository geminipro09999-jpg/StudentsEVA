"use client";

import { useEffect, useState } from "react";
import { getAllInvoices, approveInvoice } from "@/app/actions/invoiceActions";
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
        const res = await getAllInvoices();
        if (res.error) {
            setError(res.error);
        } else {
            setInvoices(res.data);
            // Initialize maps
            const dMap = {};
            const bMap = {};
            res.data.forEach(inv => {
                dMap[inv.id] = inv.deductions || 0;
                bMap[inv.id] = inv.amount || 0;
            });
            setDeductionsMap(dMap);
            setBaseAmtMap(bMap);
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

    const exportPDF = (inv) => {
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
                `Invoice No: ${String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}`,
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
                head: [['Description', 'Total - LKR']],
                body: [[
                    `Professional service fees for the month of ${inv.month} ${inv.year}`,
                    currentBase.toLocaleString()
                ]],
                theme: 'striped'
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

            // Signature
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text('Authorized Signature', 20, finalY + 45);

            if (staff.e_signature) {
                try {
                    doc.addImage(staff.e_signature, 'PNG', 20, finalY + 50, 40, 15);
                } catch (e) {
                    console.error("Signature Render Error:", e);
                }
            }

            const fileName = `${staff.name.replace(/\s+/g, '_')}_${inv.month}_${inv.year}_${String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}.pdf`;
            doc.save(fileName);
            toast.success("Final PDF generated!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF");
        }
    };

    if (loading) return <div className="container mt-8 text-center">Loading invoices...</div>;

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
                                        <td className="text-xs font-mono">{String(inv.month_no || new Date(`${inv.month} 1, ${inv.year}`).getMonth() + 1).padStart(2, '0')}</td>
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
                                                <button
                                                    onClick={() => exportPDF(inv)}
                                                    className="btn btn-secondary px-3 py-1 text-xs"
                                                >
                                                    📄 Download
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
        </div>
    );
}
