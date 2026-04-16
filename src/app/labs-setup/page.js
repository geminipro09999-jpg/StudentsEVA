import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LabsManager from "@/components/LabsManager";

export default async function LabsSetupPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect("/dashboard");
    }

    const { data: subjects } = await supabase.from('subjects').select('*').order('name') || { data: [] };
    const { data: labActivities } = await supabase.from('lab_activities').select('*').order('created_at') || { data: [] };

    return (
        <div className="container animate-fade-in mt-8">
            <h2 className="text-3xl font-bold mb-4">Laboratory Layout Setup</h2>
            <p className="text-secondary mb-8">Manage overarching Subjects and their constituent Lab Activities. Creating these correctly structures the Feedback selection for Lecturers.</p>
            <LabsManager initialSubjects={subjects || []} initialActivities={labActivities || []} />
        </div>
    );
}
