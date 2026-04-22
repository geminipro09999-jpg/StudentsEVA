import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import InvoiceGenerator from "@/components/InvoiceGenerator";
import Link from "next/link";

export default async function InvoicePage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const isAdmin = session.user.roles?.includes('admin') || session.user.role === 'admin';
    const isStaff = session.user.roles?.includes('incubator_staff');

    if (!isAdmin && !isStaff) {
        redirect("/dashboard");
    }

    // Fetch entries
    let query = supabase.from('timesheets').select('*, users(name, email, address, phone, account_name, bank_name, account_no, branch)');

    if (!isAdmin) {
        query = query.eq('lecturer_id', session.user.id);
    }

    const { data: entries } = await query.order('work_date', { ascending: true });

    // Fetch lecturers (for selection if admin)
    let lecturerQuery = supabase.from('users').select('id, name, email, roles, role, address, phone, account_name, bank_name, account_no, branch, e_signature');

    if (!isAdmin) {
        lecturerQuery = lecturerQuery.eq('id', session.user.id);
    } else {
        lecturerQuery = lecturerQuery.order('name');
    }

    const { data: lecturers } = await lecturerQuery;

    // Fetch existing submitted invoices
    let invoiceQuery = supabase.from('invoices').select('*');
    if (!isAdmin) {
        invoiceQuery = invoiceQuery.eq('user_id', session.user.id);
    }
    const { data: userInvoices } = await invoiceQuery.order('created_at', { ascending: false });

    return (
        <div className="container animate-fade-in mt-4">
            <div className="flex justify-between items-center wrap gap-4 mb-6">
                <div className="page-hero" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                    <h2>🧾 Invoice Generator</h2>
                    <p>{isAdmin ? "Generate invoices for all staff" : "Generate my monthly invoice"}</p>
                </div>
                <Link href={isAdmin ? "/timesheet/admin" : "/timesheet"} className="btn btn-secondary" style={{ fontSize: '0.88rem' }}>
                    ← Back to Timesheets
                </Link>
            </div>

            <div className="mt-12 mb-8">
                <div className="page-hero" style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                    <h3 className="text-xl font-bold">📂 Payment History</h3>
                    <p>Report of authorized salary and payment status</p>
                </div>

                <div className="glass-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Inv No</th>
                                    <th>Amount (LKR)</th>
                                    <th>Status</th>
                                    <th>Submitted On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!userInvoices || userInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-6 text-secondary">No payment history found.</td>
                                    </tr>
                                ) : (
                                    userInvoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-semibold">{inv.month} {inv.year}</td>
                                            <td className="text-xs font-mono">{String(inv.month_no || 0).padStart(2, '0')}</td>
                                            <td className="font-bold">{(inv.amount || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${inv.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                                                    {inv.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-xs text-secondary">
                                                {new Date(inv.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <InvoiceGenerator
                entries={entries || []}
                lecturers={lecturers || []}
                invoices={userInvoices || []}
                currentUserId={session.user.id}
                isAdmin={isAdmin}
            />
        </div>
    );
}
