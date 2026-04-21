import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import InvoiceGenerator from "@/components/InvoiceGenerator";
import Link from "next/link";

export default async function InvoicePage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect("/dashboard");
    }

    // Fetch all approved entries
    const { data: entries } = await supabase
        .from('timesheets')
        .select('*')
        .order('work_date', { ascending: true });

    // Fetch all lecturers
    const { data: lecturers } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'lecturer')
        .order('name');

    return (
        <div className="container animate-fade-in mt-4">
            <div className="flex justify-between items-center wrap gap-4 mb-6">
                <div className="page-hero" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                    <h2>🧾 Invoice Generator</h2>
                    <p>Generate invoices for approved lecturer timesheets</p>
                </div>
                <Link href="/timesheet/admin" className="btn btn-secondary" style={{ fontSize: '0.88rem' }}>
                    ← Back to Timesheets
                </Link>
            </div>

            <InvoiceGenerator entries={entries || []} lecturers={lecturers || []} />
        </div>
    );
}
