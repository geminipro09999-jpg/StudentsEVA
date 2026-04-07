import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { data: adminExists } = await supabase.from('users').select('id').eq('email', 'admin@eval.com').maybeSingle();
        if (!adminExists) {
            const hashedAdminPassword = await bcrypt.hash("admin123", 10);
            await supabase.from('users').insert({
                name: "Super Admin",
                email: "admin@eval.com",
                password: hashedAdminPassword,
                role: "admin"
            });
        }

        const { data: lecturerExists } = await supabase.from('users').select('id').eq('email', 'lecturer@eval.com').maybeSingle();
        if (!lecturerExists) {
            const hashedLecturerPassword = await bcrypt.hash("lecturer123", 10);
            await supabase.from('users').insert({
                name: "Dr. Jane Smith",
                email: "lecturer@eval.com",
                password: hashedLecturerPassword,
                role: "lecturer"
            });
        }

        return NextResponse.json({ message: "Database seeded successfully. You can login using admin@eval.com and lecturer@eval.com (password is admin123 and lecturer123 respectively)." }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
