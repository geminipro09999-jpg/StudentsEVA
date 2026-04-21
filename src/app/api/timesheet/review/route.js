import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ids, action, admin_note } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No entries selected" }, { status: 400 });
        }

        if (!['approved', 'rejected'].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const { error } = await supabase
            .from('timesheets')
            .update({ status: action, admin_note: admin_note || '' })
            .in('id', ids);

        if (error) throw error;

        return NextResponse.json({ success: true, count: ids.length, action });
    } catch (err) {
        console.error("Timesheet review error:", err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
