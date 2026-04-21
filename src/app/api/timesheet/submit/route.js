import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { work_date, in_time, out_time } = await request.json();

        if (!work_date || !in_time || !out_time) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // Calculate hours
        const inParts = in_time.split(':').map(Number);
        const outParts = out_time.split(':').map(Number);
        const inMinutes = inParts[0] * 60 + inParts[1];
        const outMinutes = outParts[0] * 60 + outParts[1];

        if (outMinutes <= inMinutes) {
            return NextResponse.json({ error: "Out time must be after In time" }, { status: 400 });
        }

        const hours = ((outMinutes - inMinutes) / 60).toFixed(2);

        // Ensure time has seconds for Postgres TIME type
        const in_time_db = in_time.length === 5 ? `${in_time}:00` : in_time;
        const out_time_db = out_time.length === 5 ? `${out_time}:00` : out_time;

        const { error } = await supabase
            .from('timesheets')
            .upsert({
                lecturer_id: session.user.id,
                work_date,
                in_time: in_time_db,
                out_time: out_time_db,
                hours: parseFloat(hours),
                status: 'pending',
                admin_note: '',
            }, { onConflict: 'lecturer_id,work_date' });

        if (error) {
            console.error("Supabase upsert error details:", error);
            throw error;
        }

        return NextResponse.json({ success: true, hours });
    } catch (err) {
        console.error("Full Timesheet submit error stack:", err.stack || err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
