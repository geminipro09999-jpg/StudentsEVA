import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import TimesheetForm from "@/components/TimesheetForm";

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
            <div className="page-hero">
                <h2>⏱️ My Timesheet</h2>
                <p>Log your work hours and track approval status</p>
            </div>

            <TimesheetForm entries={entries || []} lecturerName={session.user.name} />
        </div>
    );
}
