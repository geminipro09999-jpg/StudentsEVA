"use client";

import { useEffect, useState } from "react";
import { getAllInvoices, approveInvoice } from "@/app/actions/invoiceActions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminInvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [deductionsMap, setDeductionsMap] = useState({});

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
            // Initialize deductions map
            const dMap = {};
            res.data.forEach(inv => {
                dMap[inv.id] = inv.deductions || 0;
            });
            setDeductionsMap(dMap);
        }
        setLoading(false);
    }

    const handleApprove = async (invoiceId) => {
        setUpdatingId(invoiceId);
        const res = await approveInvoice(invoiceId, {
            status: 'approved',
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
                                        <td className="text-xs font-mono">{inv.invoice_no}</td>
                                        <td>LKR {inv.amount.toLocaleString()}</td>
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
                                            LKR {(inv.amount - (deductionsMap[inv.id] || 0)).toLocaleString()}
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
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(inv.id)}
                                                            disabled={updatingId === inv.id}
                                                            className="btn btn-secondary px-3 py-1 text-xs text-danger"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {inv.status === 'approved' && (
                                                    <button className="btn btn-secondary px-3 py-1 text-xs">
                                                        📄 View
                                                    </button>
                                                )}
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
