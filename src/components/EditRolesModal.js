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
        const res = await updateUserRoles(user.id, selectedRoles);
        if (res.success) {
            toast.success("Roles updated successfully");
            onClose();
        } else {
            toast.error(res.error || "Failed to update roles");
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '450px' }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold">Manage Roles</h3>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <p className="text-secondary mb-6">
                    Assign system roles to <strong>{user.name}</strong>.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4 mb-8">
                        <label className={`glass-card p-4 flex items-center gap-3 cursor-pointer transition-all ${selectedRoles.includes('lecturer') ? 'border-success bg-success/5' : ''}`}>
                            <input
                                type="checkbox"
                                checked={selectedRoles.includes('lecturer')}
                                onChange={() => toggleRole('lecturer')}
                            />
                            <div>
                                <strong className={selectedRoles.includes('lecturer') ? 'text-success' : ''}>Lecturer</strong>
                                <p className="text-xs text-secondary opacity-70">Can add evaluation feedback and student marks.</p>
                            </div>
                        </label>

                        <label className={`glass-card p-4 flex items-center gap-3 cursor-pointer transition-all ${selectedRoles.includes('admin') ? 'border-danger bg-danger/5' : ''}`}>
                            <input
                                type="checkbox"
                                checked={selectedRoles.includes('admin')}
                                onChange={() => toggleRole('admin')}
                            />
                            <div>
                                <strong className={selectedRoles.includes('admin') ? 'text-danger' : ''}>Administrator</strong>
                                <p className="text-xs text-secondary opacity-70">Full system access, user management, and setup.</p>
                            </div>
                        </label>

                        <label className={`glass-card p-4 flex items-center gap-3 cursor-pointer transition-all ${selectedRoles.includes('incubator_staff') ? 'border-accent bg-accent/5' : ''}`}>
                            <input
                                type="checkbox"
                                checked={selectedRoles.includes('incubator_staff')}
                                onChange={() => toggleRole('incubator_staff')}
                            />
                            <div>
                                <strong className={selectedRoles.includes('incubator_staff') ? 'text-accent' : ''}>Incubator Staff</strong>
                                <p className="text-xs text-secondary opacity-70">Access to personal invoicing and profile only.</p>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-card-border">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? "Saving..." : "Update Roles"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
