import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import TimesheetForm from "@/components/TimesheetForm";
import Link from "next/link";

export default async function TimesheetPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // If admin, redirect to admin timesheet page
    if (session.user.role === 'admin') {
        redirect("/timesheet/admin");
    }

    // Fetch this lecturer's timesheet entries
    const { data: entries } = await supabase
        .from('timesheets')
        .select('*')
        .eq('lecturer_id', session.user.id)
        .order('work_date', { ascending: false });

    return (
        <div className="container animate-fade-in mt-4">
            <div className="flex justify-between items-center wrap gap-4 mb-6">
                <div className="page-hero" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                    <h2>⏱️ My Timesheet</h2>
                    <p>Log your daily work hours. When the month ends, submit your invoice for admin approval.</p>
                </div>
                <Link
                    href="/timesheet/invoice"
                    className="btn btn-primary"
                    style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}
                >
                    🧾 Submit Monthly Invoice
                </Link>
            </div>

            <TimesheetForm entries={entries || []} lecturerName={session.user.name} />
        </div>
    );
}
