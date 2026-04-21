import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { rows } = await request.json();

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided" }, { status: 400 });
        }

        // Validate required fields
        for (const row of rows) {
            if (!row.ut_number || !row.month || !row.year || row.present_days === undefined || row.total_days === undefined) {
                return NextResponse.json({ error: `Missing required fields in row: ${JSON.stringify(row)}` }, { status: 400 });
            }
            if (row.month < 1 || row.month > 12) {
                return NextResponse.json({ error: `Invalid month ${row.month} for UT ${row.ut_number}` }, { status: 400 });
            }
            if (row.present_days > row.total_days) {
                return NextResponse.json({ error: `present_days (${row.present_days}) > total_days (${row.total_days}) for UT ${row.ut_number}` }, { status: 400 });
            }
        }

        // Check that all UT numbers exist in students table
        const utNumbers = [...new Set(rows.map(r => r.ut_number))];
        const { data: existingStudents, error: studErr } = await supabase
            .from('students')
            .select('student_id')
            .in('student_id', utNumbers);

        if (studErr) throw studErr;

        const foundUTs = new Set((existingStudents || []).map(s => s.student_id));
        const missing = utNumbers.filter(ut => !foundUTs.has(ut));
        if (missing.length > 0) {
            return NextResponse.json({ error: `UT numbers not found in system: ${missing.join(', ')}` }, { status: 400 });
        }

        // Prepare upsert payload
        const payload = rows.map(row => ({
            student_id: String(row.ut_number).trim(),
            month: Number(row.month),
            year: Number(row.year),
            present_days: Number(row.present_days),
            total_days: Number(row.total_days),
            uploaded_at: new Date().toISOString(),
        }));

        const { error: upsertErr } = await supabase
            .from('attendance')
            .upsert(payload, { onConflict: 'student_id,month,year' });

        if (upsertErr) throw upsertErr;

        return NextResponse.json({ success: true, count: payload.length });
    } catch (err) {
        console.error("Attendance upload error:", err);
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
