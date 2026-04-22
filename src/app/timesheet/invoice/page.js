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
    let lecturerQuery = supabase.from('users').select('id, name, email, roles, role, address, phone, account_name, bank_name, account_no, branch');

    if (!isAdmin) {
        lecturerQuery = lecturerQuery.eq('id', session.user.id);
    } else {
        lecturerQuery = lecturerQuery.order('name');
    }

    const { data: lecturers } = await lecturerQuery;

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

            <InvoiceGenerator
                entries={entries || []}
                lecturers={lecturers || []}
                currentUserId={session.user.id}
                isAdmin={isAdmin}
            />
        </div>
    );
}
