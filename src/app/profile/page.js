"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { updateProfile, getProfile } from "@/app/actions/profileActions";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        address: "",
        phone: "",
        staff_email: "",
        account_name: "",
        bank_name: "",
        account_no: "",
        branch: ""
    });

    useEffect(() => {
        if (session?.user?.id) {
            fetchProfile();
        }
    }, [session]);

    async function fetchProfile() {
        const res = await getProfile(session.user.id);
        if (res.data) {
            setFormData({
                address: res.data.address || "",
                phone: res.data.phone || "",
                staff_email: res.data.staff_email || "",
                account_name: res.data.account_name || "",
                bank_name: res.data.bank_name || "",
                account_no: res.data.account_no || "",
                branch: res.data.branch || ""
            });
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateProfile(session.user.id, formData);
        if (res.success) {
            toast.success("Profile updated successfully!");
            // Update session if needed
            update({
                address: formData.address,
                phone: formData.phone,
                staff_email: formData.staff_email
            });
        } else {
            toast.error(res.error || "Failed to update profile");
        }
        setLoading(false);
    };

    if (!session) return <div className="container mt-8 text-center">Please login to view profile.</div>;

    return (
        <div className="container animate-fade-in mt-8">
            <div className="page-hero">
                <h2>👤 My Profile</h2>
                <p>Manage your personal information and banking details for invoicing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="glass-card">
                        <h3 className="text-xl font-bold mb-6 text-accent">Contact Information</h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label>Full Name</label>
                                <input type="text" value={session.user.name} disabled className="opacity-50" />
                            </div>
                            <div>
                                <label>Login Email (Read-only)</label>
                                <input type="text" value={session.user.email} disabled className="opacity-50" />
                            </div>
                            <div className="accent-group" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.03)', borderRadius: '0.8rem', borderLeft: '4px solid var(--accent-color)' }}>
                                <label style={{ color: 'var(--accent-color)', fontWeight: '600' }}>Official Email (for Invoices)</label>
                                <input
                                    type="email"
                                    name="staff_email"
                                    value={formData.staff_email}
                                    onChange={handleChange}
                                    placeholder="your-staff-id@unicomtic.com"
                                    style={{ background: 'var(--card-bg)' }}
                                />
                                <small className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                                    This email will appear on your generated invoices instead of your login email.
                                </small>
                            </div>
                            <div>
                                <label>Phone Number</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+94 77 XXX XXXX" />
                            </div>
                            <div>
                                <label>Personal Address</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="123 Road, City, Country" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary p-4 text-lg">
                        {loading ? "Saving Changes..." : "🚀 Save Profile Settings"}
                    </button>
                </form>

                <div className="glass-card">
                    <h3 className="text-xl font-bold mb-6 text-accent">Bank Details (for Invoicing)</h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label>Account Holder Name</label>
                            <input type="text" name="account_name" value={formData.account_name} onChange={handleChange} placeholder="Full Name on Bank Account" />
                        </div>
                        <div>
                            <label>Bank Name</label>
                            <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="e.g. Bank of Ceylon" />
                        </div>
                        <div>
                            <label>Account Number</label>
                            <input type="text" name="account_no" value={formData.account_no} onChange={handleChange} placeholder="XXXXXXXXXX" />
                        </div>
                        <div>
                            <label>Branch</label>
                            <input type="text" name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Jaffna Main Branch" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
