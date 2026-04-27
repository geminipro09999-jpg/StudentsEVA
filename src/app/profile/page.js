"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { updateProfile, getProfile, updateMyPassword } from "@/app/actions/profileActions";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [formData, setFormData] = useState({
        address: "",
        phone: "",
        staff_email: "",
        account_name: "",
        bank_name: "",
        account_no: "",
        branch: "",
        e_signature: ""
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
                branch: res.data.branch || "",
                e_signature: res.data.e_signature || ""
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

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        const res = await updateMyPassword(session.user.id, newPassword);
        if (res.success) {
            toast.success("Password updated successfully! Next login will require this new password.");
            setNewPassword("");
        } else {
            toast.error(res.error || "Failed to update password");
        }
        setPasswordLoading(false);
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

                <div className="flex flex-col gap-8">
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

                    <div className="glass-card border-l-4 border-danger">
                        <h3 className="text-xl font-bold mb-6 text-danger flex items-center gap-2">
                            <span>🔒</span> Security Settings
                        </h3>
                        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                            <div>
                                <label>Set New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 characters)"
                                    required
                                    minLength="6"
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-secondary mt-1">If you update your password, your current session remains active, but you must use the new password next time.</p>
                            </div>
                            <button type="submit" disabled={passwordLoading || !newPassword} className="btn" style={{ background: 'var(--danger)', color: 'white', alignSelf: 'flex-start' }}>
                                {passwordLoading ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="glass-card mt-6">
                    <h3 className="text-xl font-bold mb-6 text-accent">🖋️ Digital Signature</h3>
                    <p className="text-sm text-secondary mb-4">
                        Upload your e-signature image. This will be automatically added to your submitted invoices.
                    </p>

                    <div className="flex flex-col gap-4 items-center">
                        {formData.e_signature ? (
                            <div className="signature-preview-container mb-4">
                                <img
                                    src={formData.e_signature}
                                    alt="Signature Preview"
                                    style={{ maxHeight: '80px', border: '1px dashed var(--accent-light)', padding: '10px', background: 'white' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, e_signature: "" }))}
                                    className="text-xs text-red-500 mt-2 block mx-auto underline"
                                >
                                    Remove Signature
                                </button>
                            </div>
                        ) : (
                            <div className="text-center p-8 border-2 border-dashed border-gray-400 rounded-xl w-full">
                                <span className="text-4xl">🖋️</span>
                                <p className="text-sm mt-2">No signature uploaded</p>
                            </div>
                        )}

                        <div className="w-full">
                            <label className="btn btn-secondary w-full cursor-pointer text-center">
                                {formData.e_signature ? "🔄 Change Signature" : "📤 Upload Signature Image"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setFormData(p => ({ ...p, e_signature: reader.result }));
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                            <small className="text-xs text-secondary mt-2 block text-center">
                                Recommended size: 300x100px (PNG/JPG)
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
