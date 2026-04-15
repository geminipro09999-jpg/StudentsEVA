"use client";
import { useState } from "react";
import { changeUserPassword } from "@/app/actions/usersActions";

export default function ChangePasswordModal({ user, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        formData.append("userId", user.id);

        const res = await changeUserPassword(formData);

        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="glass-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
                <h3 className="mb-4">Change Password</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Updating password for <strong>{user.name}</strong> ({user.email})
                </p>

                {error && (
                    <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 rounded" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.85rem' }}>
                        Password updated successfully!
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label>New Password</label>
                            <input type="password" name="newPassword" placeholder="Minimum 6 characters" required minLength={6} />
                        </div>
                        <div className="d-flex gap-1 mt-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                                {loading ? "Updating..." : "Update Password"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
