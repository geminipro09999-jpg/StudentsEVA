"use client";

import { useState } from "react";
import { addUser } from "@/app/actions/addUser";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AddUserPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState(['lecturer']);

    const handleRoleChange = (e) => {
        const { value, checked } = e.target;
        if (checked) {
            setSelectedRoles(prev => [...prev, value]);
        } else {
            setSelectedRoles(prev => prev.filter(r => r !== value));
        }
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const res = await addUser(formData);

        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    if (session?.user?.role !== 'admin') {
        return (
            <div className="container animate-fade-in mt-4 text-center">
                <h2>Unauthorized Area</h2>
                <p style={{ color: 'var(--danger)' }}>Only administrators are allowed to create new accounts.</p>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in mt-4">
            <div className="text-center mb-4">
                <h2>Add System User</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Register a new Lecturer or Administrator.</p>
            </div>

            <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                {error && (
                    <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label>Full Name</label>
                        <input type="text" name="name" placeholder="Dr. John Doe" required autoComplete="name" />
                    </div>
                    <div>
                        <label>Email Address</label>
                        <input type="email" name="email" placeholder="john@eval.com" required autoComplete="email" />
                    </div>
                    <div>
                        <label>Temporary Password</label>
                        <input type="password" name="password" placeholder="••••••••" required minLength="6" autoComplete="new-password" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label>Roles</label>
                        <div className="flex flex-wrap gap-4 p-3 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="roles" value="lecturer" checked={selectedRoles.includes('lecturer')} onChange={handleRoleChange} />
                                <span className="text-sm">Lecturer (Per Day)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="roles" value="lecturer_hourly" checked={selectedRoles.includes('lecturer_hourly')} onChange={handleRoleChange} />
                                <span className="text-sm">Lecturer* (Hourly)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="roles" value="admin" checked={selectedRoles.includes('admin')} onChange={handleRoleChange} />
                                <span className="text-sm">Administrator</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="roles" value="incubator_staff" checked={selectedRoles.includes('incubator_staff')} onChange={handleRoleChange} />
                                <span className="text-sm">Incubator Staff (Monthly)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-2">
                        <label>Payment Methods</label>
                        <div className="flex flex-col gap-3 p-4 rounded bg-white/5 border border-card-border">
                            {/* Hourly */}
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="payment_methods" value="hourly" defaultChecked={selectedRoles.includes('lecturer')} />
                                    <span className="text-sm font-semibold">Enable Hourly Payment</span>
                                </label>
                                <div className="pl-6 text-xs text-secondary mb-1">
                                    <label className="block mb-1">Hourly Rate (LKR)</label>
                                    <input type="number" name="hourly_rate" defaultValue="3000" className="w-full" />
                                </div>
                            </div>

                            {/* Unit */}
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="payment_methods" value="unit" />
                                    <span className="text-sm font-semibold">Enable Unit Payment</span>
                                </label>
                                <div className="pl-6 text-xs text-secondary mb-1">
                                    <label className="block mb-1">Unit Rate (LKR)</label>
                                    <input type="number" name="unit_rate" defaultValue="0" className="w-full" />
                                </div>
                            </div>

                            {/* Monthly */}
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="payment_methods" value="monthly" defaultChecked={selectedRoles.includes('incubator_staff')} />
                                    <span className="text-sm font-semibold">Enable Fixed Monthly Salary</span>
                                </label>
                                <div className="pl-6 text-xs text-secondary mb-1">
                                    <label className="block mb-1">Monthly Salary (LKR)</label>
                                    <input type="number" name="monthly_salary" defaultValue="0" className="w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary mt-2" style={{ padding: '1rem' }}>
                        {loading ? "Creating..." : "Create User"}
                    </button>
                </form>
            </div>
        </div>
    );
}
