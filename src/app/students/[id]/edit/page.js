import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import EditStudentForm from "@/components/EditStudentForm";
import Link from "next/link";

export default async function EditStudentPage({ params }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        redirect("/dashboard");
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

    if (!student) {
        notFound();
    }

    return (
        <div className="container mt-4 animate-fade-in">
            <Link href="/dashboard" className="btn btn-secondary mb-4" style={{ fontSize: '0.85rem', display: 'inline-flex', padding: '0.4rem 0.8rem' }}>
                ← Back to Dashboard
            </Link>

            <div className="text-center mb-4">
                <h2 style={{ fontSize: '2rem' }}>Edit Student Profile</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Update information for {student.name}</p>
            </div>

            <EditStudentForm student={student} />
        </div>
    );
}
