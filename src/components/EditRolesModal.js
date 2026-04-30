"use client";

import { useState } from "react";
import { updateUserRoles } from "@/app/actions/usersActions";
import toast from "react-hot-toast";

export default function EditRolesModal({ user, onClose }) {
    const initialRoles = (user.roles || [user.role]).map(r => r === 'administrator' ? 'admin' : r);
    const [selectedRoles, setSelectedRoles] = useState(initialRoles);
    const [paymentMethods, setPaymentMethods] = useState(user.payment_methods || []);
    const [hourlyRate, setHourlyRate] = useState(user.hourly_rate || 3000);
    const [unitRate, setUnitRate] = useState(user.unit_rate || 0);
    const [monthlySalary, setMonthlySalary] = useState(user.monthly_salary || 0);
    const [loading, setLoading] = useState(false);

    const toggleRole = (role) => {
        if (selectedRoles.includes(role)) {
            if (selectedRoles.length > 1) {
                setSelectedRoles(selectedRoles.filter(r => r !== role));
            } else {
                toast.error("At least one role is required");
            }
        } else {
            const nextRoles = [...selectedRoles, role];
            setSelectedRoles(nextRoles);
            
            // Auto-tick appropriate payment methods if it's a new setup
            if (role === 'lecturer') setPaymentMethods(prev => Array.from(new Set([...prev, 'unit'])));
            if (role === 'lecturer_hourly') setPaymentMethods(prev => Array.from(new Set([...prev, 'hourly'])));
            if (role === 'incubator_staff') setPaymentMethods(prev => Array.from(new Set([...prev, 'monthly'])));
        }
    };

    const showHourly = selectedRoles.includes('lecturer_hourly') || selectedRoles.includes('admin');
    const showUnit = selectedRoles.includes('lecturer') || selectedRoles.includes('admin');
    const showMonthly = selectedRoles.includes('incubator_staff') || selectedRoles.includes('admin');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateUserRoles(user.id, selectedRoles, {
            payment_methods: paymentMethods,
            hourly_rate: hourlyRate,
            unit_rate: unitRate,
            monthly_salary: monthlySalary
        });
        if (res.success) {
            toast.success("Roles updated successfully");
            onClose();
        } else {
            toast.error(res.error || "Failed to update roles");
        }
        setLoading(false);
    };

    const roleOptions = [
        { key: 'lecturer', label: 'Lecturer (Per Day)', sublabel: 'Paid per day worked', color: 'var(--accent-color)', borderActive: 'var(--accent-color)', bgActive: 'rgba(99,102,241,0.06)' },
        { key: 'lecturer_hourly', label: 'Lecturer* (Hourly)', sublabel: 'Paid per hour logged', color: 'var(--warning)', borderActive: 'var(--warning)', bgActive: 'rgba(245,158,11,0.06)' },
        { key: 'admin', label: 'Administrator', sublabel: 'Full system access', color: 'var(--danger)', borderActive: 'var(--danger)', bgActive: 'rgba(239,68,68,0.06)' },
        { key: 'incubator_staff', label: 'Incubator Staff (Monthly)', sublabel: 'Fixed monthly salary', color: 'var(--success)', borderActive: 'var(--success)', bgActive: 'rgba(34,197,94,0.06)' },
    ];

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content animate-fade-in-scale p-0 flex flex-col" style={{ maxWidth: '550px', maxHeight: '90vh' }}>
                {/* Header - Fixed */}
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-card-bg rounded-t-2xl sticky top-0 z-20">
                    <div>
                        <h3 className="text-xl font-bold">Edit User Permissions</h3>
                        <p className="text-sm text-secondary">{user.name}</p>
                    </div>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Body - Scrollable */}
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="mb-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4">System Roles</h4>
                            <div className="flex flex-col gap-3">
                                {roleOptions.map(({ key, label, sublabel, color, borderActive, bgActive }) => {
                                    const active = selectedRoles.includes(key);
                                    return (
                                        <label
                                            key={key}
                                            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                                            style={{
                                                borderColor: active ? borderActive : 'rgba(255,255,255,0.1)',
                                                background: active ? bgActive : 'transparent',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => toggleRole(key)}
                                            />
                                            <div>
                                                <p className="font-semibold text-sm" style={{ color: active ? color : 'inherit' }}>{label}</p>
                                                <p className="text-xs text-secondary">{sublabel}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-t border-card-border pt-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4">Payment Configuration</h4>
                            
                            <div className="flex flex-col gap-3">
                                {/* Hourly */}
                                {showHourly && (
                                    <div className={`p-3 rounded-xl border transition-all ${paymentMethods.includes('hourly') ? 'border-accent bg-accent/5' : 'border-card-border opacity-70'}`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                <input 
                                                    type="checkbox" 
                                                    checked={paymentMethods.includes('hourly')} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) setPaymentMethods([...paymentMethods, 'hourly']);
                                                        else setPaymentMethods(paymentMethods.filter(m => m !== 'hourly'));
                                                    }} 
                                                />
                                                <span className="text-sm font-bold">Hourly Basis</span>
                                            </label>
                                            {paymentMethods.includes('hourly') && (
                                                <div className="flex items-center gap-2 animate-fade-in">
                                                    <span className="text-[10px] uppercase text-secondary">Rate:</span>
                                                    <input 
                                                        type="number" 
                                                        value={hourlyRate} 
                                                        onChange={e => setHourlyRate(e.target.value)} 
                                                        className="w-24 text-right text-sm py-1 bg-transparent border border-card-border rounded px-2"
                                                    />
                                                    <span className="text-xs text-secondary">/ hr</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Unit */}
                                {showUnit && (
                                    <div className={`p-3 rounded-xl border transition-all ${paymentMethods.includes('unit') ? 'border-accent bg-accent/5' : 'border-card-border opacity-70'}`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                <input 
                                                    type="checkbox" 
                                                    checked={paymentMethods.includes('unit')} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) setPaymentMethods([...paymentMethods, 'unit']);
                                                        else setPaymentMethods(paymentMethods.filter(m => m !== 'unit'));
                                                    }} 
                                                />
                                                <span className="text-sm font-bold">Per Day Basis</span>
                                            </label>
                                            {paymentMethods.includes('unit') && (
                                                <div className="flex items-center gap-2 animate-fade-in">
                                                    <span className="text-[10px] uppercase text-secondary">Rate:</span>
                                                    <input 
                                                        type="number" 
                                                        value={unitRate} 
                                                        onChange={e => setUnitRate(e.target.value)} 
                                                        className="w-24 text-right text-sm py-1 bg-transparent border border-card-border rounded px-2"
                                                    />
                                                    <span className="text-xs text-secondary">/ day</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Monthly */}
                                {showMonthly && (
                                    <div className={`p-3 rounded-xl border transition-all ${paymentMethods.includes('monthly') ? 'border-accent bg-accent/5' : 'border-card-border opacity-70'}`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                <input 
                                                    type="checkbox" 
                                                    checked={paymentMethods.includes('monthly')} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) setPaymentMethods([...paymentMethods, 'monthly']);
                                                        else setPaymentMethods(paymentMethods.filter(m => m !== 'monthly'));
                                                    }} 
                                                />
                                                <span className="text-sm font-bold">Monthly Salary</span>
                                            </label>
                                            {paymentMethods.includes('monthly') && (
                                                <div className="flex items-center gap-2 animate-fade-in">
                                                    <span className="text-[10px] uppercase text-secondary">Salary:</span>
                                                    <input 
                                                        type="number" 
                                                        value={monthlySalary} 
                                                        onChange={e => setMonthlySalary(e.target.value)} 
                                                        className="w-24 text-right text-sm py-1 bg-transparent border border-card-border rounded px-2"
                                                    />
                                                    <span className="text-xs text-secondary">/ mo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer - Fixed */}
                    <div className="p-6 border-t border-card-border flex justify-end gap-3 bg-card-bg rounded-b-2xl sticky bottom-0 z-20">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary min-w-[120px]">
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
