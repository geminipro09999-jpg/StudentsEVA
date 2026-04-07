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
                        <input type="text" name="name" placeholder="Dr. John Doe" required />
                    </div>
                    <div>
                        <label>Email Address</label>
                        <input type="email" name="email" placeholder="john@eval.com" required />
                    </div>
                    <div>
                        <label>Temporary Password</label>
                        <input type="password" name="password" placeholder="••••••••" required minLength="6" />
                    </div>
                    <div>
                        <label>Role</label>
                        <select name="role" required>
                            <option value="lecturer">Lecturer</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary mt-2" style={{ padding: '1rem' }}>
                        {loading ? "Creating..." : "Create User"}
                    </button>
                </form>
            </div>
        </div>
    );
}
