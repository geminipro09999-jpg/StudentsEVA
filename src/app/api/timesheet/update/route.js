import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        const roles = session?.user?.roles || [];
        const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r)) ||
            ['admin', 'administrator'].includes(session?.user?.role);

        if (!session || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, work_date, in_time, out_time, hours } = await request.json();

        if (!id) {
            return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
        }

        const { error } = await supabase
            .from('timesheets')
            .update({
                work_date,
                in_time,
                out_time,
                hours,
                status: 'pending' // Ensure it stays pending if edited
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Timesheet update error:", err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
