import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import TimesheetAdmin from "@/components/TimesheetAdmin";
import Link from "next/link";

export default async function TimesheetAdminPage() {
    const session = await getServerSession(authOptions);

    const roles = session?.user?.roles || [];
    const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r)) ||
        ['admin', 'administrator'].includes(session?.user?.role);

    if (!session || !isAdmin) {
        redirect("/timesheet");
    }

    // Fetch ALL timesheet entries with user info joined
    const { data: entries } = await supabase
        .from('timesheets')
        .select('*, users(id, name, email)')
        .order('work_date', { ascending: false });

    // Fetch all non-admin users as potential lecturers (covers both role and roles fields)
    const { data: allUsers } = await supabase
        .from('users')
        .select('id, name, email, role, roles')
        .order('name');

    // Filter out pure admins — show anyone who could submit a timesheet
    const lecturers = (allUsers || []).filter(u => {
        const userRoles = u.roles || [u.role] || [];
        return !userRoles.every(r => ['admin', 'administrator'].includes(r));
    });

    return (
        <div className="container animate-fade-in mt-4">
            <div className="flex justify-between items-center wrap gap-4 mb-6">
                <div className="page-hero" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                    <h2>🕐 Timesheet Management</h2>
                    <p>Review and approve all staff work hour logs</p>
                </div>
                <Link href="/timesheet/invoice" className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
                    🧾 Generate Invoices
                </Link>
            </div>

            <TimesheetAdmin entries={entries || []} lecturers={lecturers || []} />
        </div>
    );
}
