"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });
        setLoading(false);
        if (res?.error) {
            setError(res.error);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            position: 'relative',
        }}>
            {/* Floating orbs */}
            <div style={{
                position: 'fixed', top: '15%', left: '10%',
                width: '300px', height: '300px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
                borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'fixed', bottom: '15%', right: '10%',
                width: '250px', height: '250px',
                background: 'radial-gradient(circle, rgba(192,132,252,0.1), transparent 70%)',
                borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
            }} />

            <div className="animate-fade-in-scale" style={{
                width: '100%',
                maxWidth: '420px',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '2.5rem 2.25rem',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-lg), 0 0 60px rgba(99,102,241,0.06)',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src="/logo.png" alt="EvalCore" style={{ height: '80px', width: 'auto', margin: '0 auto 0.75rem' }} />
                    <h2 style={{
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.4rem',
                    }}>
                        EvalCore
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to the evaluation system</p>
                </div>

                {error && (
                    <div style={{
                        marginBottom: '1.25rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(248, 113, 113, 0.08)',
                        border: '1px solid rgba(248, 113, 113, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--danger)',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="admin@eval.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                        style={{
                            padding: '0.85rem',
                            marginTop: '0.5rem',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                        }}
                    >
                        {loading ? '⏳ Signing in...' : 'Continue to Dashboard →'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    Student Evaluation System v2.0
                </div>
            </div>
        </div>
    );
}
