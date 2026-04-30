import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getVivaDetails } from "@/app/actions/vivaActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import VivaScoringClient from "@/components/VivaScoringClient";

export default async function VivaScoringPage({ params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { data: viva, error } = await getVivaDetails(id);
    if (error || !viva) redirect("/vivas");

    // Check if user is a panelist (unless admin)
    const isAdmin = session.user.roles?.includes('admin') || session.user.role === 'admin';
    const isPanelist = viva.panelists.some(p => p.user_id === session.user.id) || isAdmin;

    if (!isPanelist) {
        return (
            <div className="container mt-12 text-center">
                <h2 className="text-2xl font-bold text-danger">Access Denied</h2>
                <p className="text-secondary">You are not assigned as a panelist for this Viva.</p>
                <Link href="/vivas" className="btn btn-secondary mt-6">Back to Vivas</Link>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in mt-4">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/vivas" className="btn btn-secondary p-2">← Back</Link>
                <div>
                    <h2 className="text-3xl font-bold">{viva.name}</h2>
                    <p className="text-secondary">Evaluate students for this session.</p>
                </div>
            </div>

            <VivaScoringClient viva={viva} isAdmin={isAdmin} />
        </div>
    );
}
