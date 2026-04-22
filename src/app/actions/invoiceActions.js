"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Staff submits an invoice for approval
 */
export async function submitInvoice(invoiceData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const { data, error } = await supabase
            .from('invoices')
            .upsert({
                user_id: session.user.id,
                invoice_no: invoiceData.invoice_no,
                month: invoiceData.month,
                year: invoiceData.year,
                amount: invoiceData.amount,
                invoice_data: invoiceData,
                status: 'pending'
            }, { onConflict: 'invoice_no' });

        if (error) throw error;

        revalidatePath("/timesheet/invoice");
        return { success: true };
    } catch (error) {
        console.error("submitInvoice error:", error);
        return { error: error.message };
    }
}

/**
 * Admin approves or rejects an invoice with deductions
 */
export async function approveInvoice(invoiceId, update) {
    try {
        const session = await getServerSession(authOptions);
        const roles = session?.user?.roles || [];
        const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r)) ||
            ['admin', 'administrator'].includes(session?.user?.role);

        if (!session || !isAdmin) throw new Error("Unauthorized: Admin only");

        const { error } = await supabase
            .from('invoices')
            .update({
                status: update.status,
                amount: update.amount,
                deductions: update.deductions || 0,
                updated_at: new Date()
            })
            .eq('id', invoiceId);

        if (error) throw error;

        revalidatePath("/timesheet/admin/invoices");
        return { success: true };
    } catch (error) {
        console.error("approveInvoice error:", error);
        return { error: error.message };
    }
}

/**
 * Get all invoices for admin review
 */
export async function getAllInvoices() {
    try {
        const session = await getServerSession(authOptions);
        const roles = session?.user?.roles || [];
        const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r)) ||
            ['admin', 'administrator'].includes(session?.user?.role);

        if (!session || !isAdmin) throw new Error("Unauthorized");

        const { data, error } = await supabase
            .from('invoices')
            .select('*, users(name, email, staff_email, address, phone, account_name, bank_name, account_no, branch, e_signature)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data };
    } catch (error) {
        return { error: error.message };
    }
}
