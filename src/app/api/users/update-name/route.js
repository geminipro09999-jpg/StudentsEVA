import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.roles?.includes('admin') || session?.user?.role === 'admin';
        if (!session || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, newName } = await request.json();
        if (!userId || !newName?.trim()) {
            return NextResponse.json({ error: "User ID and name are required." }, { status: 400 });
        }

        const { error } = await supabase
            .from('users')
            .update({ name: newName.trim() })
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("update-name route error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
