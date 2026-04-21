import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import TimesheetAdmin from "@/components/TimesheetAdmin";
import Link from "next/link";

export default async function TimesheetAdminPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect("/timesheet");
    }

    // Fetch all timesheet entries
    const { data: entries } = await supabase
        .from('timesheets')
        .select('*')
        .order('work_date', { ascending: false });

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
                    <h2>🕐 Timesheet Management</h2>
                    <p>Review and approve lecturer work hours</p>
                </div>
                <Link href="/timesheet/invoice" className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
                    🧾 Generate Invoices
                </Link>
            </div>

            <TimesheetAdmin entries={entries || []} lecturers={lecturers || []} />
        </div>
    );
}
