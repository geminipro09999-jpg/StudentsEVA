"use client";
import { useState } from "react";

export default function EditNameModal({ user, onClose }) {
    const [name, setName] = useState(user.name || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError("");

        const res = await fetch('/api/users/update-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, newName: name }),
        }).then(r => r.json());

        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 3000); // Increased to 3 seconds
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
        >
            <div className="glass-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
                <h3 className="mb-4">Edit User Name</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Editing name for <strong>{user.email}</strong>
                </p>

                {error && (
                    <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 rounded" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.85rem' }}>
                        Name updated successfully!
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label>New Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter new display name"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="d-flex gap-1 mt-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary flex-1">
                                {loading ? "Saving..." : "Save Name"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
