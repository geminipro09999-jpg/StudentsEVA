import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import DiscontinuedReport from "@/components/DiscontinuedReport";

export const metadata = {
    title: "Discontinued Students Report",
    description: "Admin report of all discontinued students with reasons and reactivation options.",
};

export default async function DiscontinuedReportPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect("/dashboard");
    }

    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'discontinued')
        .order('discontinued_at', { ascending: false });

    return (
        <div className="container animate-fade-in mt-4">
            <Link
                href="/dashboard"
                className="btn btn-secondary mb-4"
                style={{ fontSize: '0.85rem', display: 'inline-flex', padding: '0.4rem 0.8rem' }}
            >
                ← Back to Dashboard
            </Link>

            <div className="text-center mb-6">
                <h2 style={{ fontSize: '2rem' }}>Discontinued Students Report</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Admin-only view of students who have been discontinued, with reasons and reactivation controls.
                </p>
            </div>

            <DiscontinuedReport students={students || []} />
        </div>
    );
}
