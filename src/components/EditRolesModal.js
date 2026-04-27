"use client";

import { useState } from "react";
import { updateUserRoles } from "@/app/actions/usersActions";
import toast from "react-hot-toast";

export default function EditRolesModal({ user, onClose }) {
    const initialRoles = (user.roles || [user.role]).map(r => r === 'administrator' ? 'admin' : r);
    const [selectedRoles, setSelectedRoles] = useState(initialRoles);
    const [loading, setLoading] = useState(false);

    const toggleRole = (role) => {
        if (selectedRoles.includes(role)) {
            if (selectedRoles.length > 1) {
                setSelectedRoles(selectedRoles.filter(r => r !== role));
            } else {
                toast.error("At least one role is required");
            }
        } else {
            setSelectedRoles([...selectedRoles, role]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateUserRoles(user.id, selectedRoles, {});
        if (res.success) {
            toast.success("Roles updated successfully");
            onClose();
        } else {
            toast.error(res.error || "Failed to update roles");
        }
        setLoading(false);
    };

    const roleOptions = [
        { key: 'lecturer', label: 'Lecturer', sublabel: 'Can log timesheets & submit invoices', color: 'var(--accent-color)', borderActive: 'var(--accent-color)', bgActive: 'rgba(99,102,241,0.06)' },
        { key: 'admin', label: 'Administrator', sublabel: 'Full system access', color: 'var(--danger)', borderActive: 'var(--danger)', bgActive: 'rgba(239,68,68,0.06)' },
        { key: 'incubator_staff', label: 'Incubator Staff', sublabel: 'Fixed salary invoice user', color: 'var(--success)', borderActive: 'var(--success)', bgActive: 'rgba(34,197,94,0.06)' },
    ];

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '420px' }}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold">Edit Roles</h3>
                        <p className="text-sm text-secondary">{user.name}</p>
                    </div>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-3 mb-6">
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

                    <div className="flex justify-end gap-3 pt-4 border-t border-card-border">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? "Saving..." : "Save Roles"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
