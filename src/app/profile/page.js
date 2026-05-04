"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { updateProfile, getProfile, updateMyPassword } from "@/app/actions/profileActions";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");
    
    // Security states
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

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

    const handleSaveProfile = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        const res = await updateProfile(session.user.id, formData);
        if (res.success) {
            toast.success("Settings saved successfully!");
            update({
                address: formData.address,
                phone: formData.phone,
                staff_email: formData.staff_email
            });
        } else {
            toast.error(res.error || "Failed to save settings");
        }
        setLoading(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }
        setPasswordLoading(true);
        const res = await updateMyPassword(session.user.id, newPassword);
        if (res.success) {
            toast.success("Password updated successfully!");
            setNewPassword("");
            setConfirmPassword("");
        } else {
            toast.error(res.error || "Failed to update password");
        }
        setPasswordLoading(false);
    };

    if (!session) return <div className="container mt-8 text-center">Please login to view profile.</div>;

    const tabs = [
        { id: "general", label: "General", icon: "👤" },
        { id: "bank", label: "Bank Details", icon: "🏦" },
        { id: "signature", label: "Digital Signature", icon: "🖋️" },
        { id: "security", label: "Security", icon: "🔒" },
    ];

    return (
        <div className="container animate-fade-in mt-8 pb-20">
            <div className="page-hero text-center mb-12">
                <h2 className="text-4xl font-bold mb-2">My Profile</h2>
                <p className="text-secondary max-w-2xl mx-auto">Customize your account settings, business information, and security preferences</p>
            </div>

            {/* Tab Navigation - Centered */}
            <div className="flex justify-center gap-3 mb-12 overflow-x-auto pb-4 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ 
                            padding: '0.8rem 1.8rem', 
                            whiteSpace: 'nowrap',
                            minWidth: '160px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: activeTab === tab.id ? 'var(--shadow-glow)' : 'none',
                            border: activeTab === tab.id ? '1px solid var(--accent-color)' : '1px solid var(--card-border)'
                        }}
                    >
                        <span style={{ marginRight: '0.6rem', fontSize: '1.1rem' }}>{tab.icon}</span>
                        <span className="font-semibold">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="max-w-4xl mx-auto">
                {/* General Tab */}
                {activeTab === "general" && (
                    <div className="glass-card animate-fade-in-scale">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-accent">Contact Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label>Full Name</label>
                                <input type="text" value={session.user.name} disabled className="opacity-60 bg-surface-container" />
                                <small className="text-secondary mt-1 block">Contact admin to change your name.</small>
                            </div>
                            <div>
                                <label>Login Email</label>
                                <input type="text" value={session.user.email} disabled className="opacity-60 bg-surface-container" />
                                <small className="text-secondary mt-1 block">Used for authentication.</small>
                            </div>
                            <div className="md:col-span-2 p-4 rounded-xl border border-accent/20 bg-accent/5">
                                <label className="text-accent font-bold">Official Email (for Invoices)</label>
                                <input
                                    type="email"
                                    name="staff_email"
                                    value={formData.staff_email}
                                    onChange={handleChange}
                                    placeholder="your-staff-id@unicomtic.com"
                                    className="bg-surface-container-low"
                                />
                                <small className="text-secondary mt-2 block">
                                    This email will appear on your generated invoices and communications.
                                </small>
                            </div>
                            <div>
                                <label>Phone Number</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+94 77 XXX XXXX" />
                            </div>
                            <div>
                                <label>Address</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="123 Road, City, Country" />
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-card-border flex justify-end">
                            <button onClick={handleSaveProfile} disabled={loading} className="btn btn-primary px-8">
                                {loading ? "Saving..." : "Save Contact Info"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Bank Details Tab */}
                {activeTab === "bank" && (
                    <div className="glass-card animate-fade-in-scale">
                        <h3 className="text-xl font-bold mb-6 text-accent">Bank Details (Invoicing)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label>Account Holder Name</label>
                                <input type="text" name="account_name" value={formData.account_name} onChange={handleChange} placeholder="Full Name as per Bank Account" />
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
                                <label>Branch Name</label>
                                <input type="text" name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Jaffna Main" />
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-card-border flex justify-end">
                            <button onClick={handleSaveProfile} disabled={loading} className="btn btn-primary px-8">
                                {loading ? "Saving..." : "Save Bank Details"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Digital Signature Tab */}
                {activeTab === "signature" && (
                    <div className="glass-card animate-fade-in-scale">
                        <h3 className="text-xl font-bold mb-6 text-accent">🖋️ Digital Signature</h3>
                        <p className="text-secondary mb-6">
                            Upload a clear image of your signature. It will be automatically embedded into your invoices.
                        </p>
                        
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                            <div className="flex-1 w-full">
                                {formData.e_signature ? (
                                    <div className="p-4 bg-white rounded-xl border-2 border-dashed border-accent/30 flex flex-col items-center">
                                        <img
                                            src={formData.e_signature}
                                            alt="Current Signature"
                                            style={{ maxHeight: '120px', maxWidth: '100%' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, e_signature: "" }))}
                                            className="text-xs text-danger mt-4 font-bold uppercase tracking-wider"
                                        >
                                            🗑️ Remove and Re-upload
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-card-border rounded-2xl cursor-pointer hover:border-accent transition-colors bg-surface-container-low">
                                        <span className="text-5xl mb-4">📤</span>
                                        <span className="font-bold">Upload Signature Image</span>
                                        <span className="text-xs text-secondary mt-2">PNG/JPG (transparent PNG recommended)</span>
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
                                )}
                            </div>
                            
                            <div className="flex-1">
                                <div className="p-4 rounded-xl bg-surface-container-high border border-card-border h-full">
                                    <h4 className="font-bold mb-2">Instructions:</h4>
                                    <ul className="text-sm text-secondary flex flex-col gap-2 list-disc pl-4">
                                        <li>Sign on a clean white piece of paper.</li>
                                        <li>Take a well-lit photo or scan.</li>
                                        <li>Crop the image to focus on the signature.</li>
                                        <li>Maximum recommended size: 600x200px.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-card-border flex justify-end">
                            <button onClick={handleSaveProfile} disabled={loading} className="btn btn-primary px-8">
                                {loading ? "Saving..." : "Apply Signature"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                    <div className="glass-card animate-fade-in-scale border-l-4 border-danger">
                        <h3 className="text-xl font-bold mb-6 text-danger flex items-center gap-2">
                            <span>🔒</span> Password Management
                        </h3>
                        
                        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Minimum 6 characters"
                                            required
                                            minLength="6"
                                            autoComplete="new-password"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                        >
                                            {showPassword ? "👁️" : "👁️‍🗨️"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label>Confirm Password</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat new password"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-danger/5 border border-danger/20">
                                <p className="text-xs text-secondary leading-relaxed">
                                    Updating your password will not log you out of your current session. 
                                    However, you must use the new password for all future login attempts. 
                                    Please ensure you remember it before clicking update.
                                </p>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={passwordLoading || !newPassword || newPassword !== confirmPassword} 
                                    className="btn btn-primary px-10"
                                    style={{ background: 'var(--danger)', border: 'none' }}
                                >
                                    {passwordLoading ? "Updating..." : "Update Security Key"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
