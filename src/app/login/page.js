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
        <div className="login-wrapper">
            {/* Ambient Background Glows */}
            <div className="ambient-orb orb-1"></div>
            <div className="ambient-orb orb-2"></div>

            <div className="animate-fade-in-scale glass-card login-card">
                {/* Brand Header */}
                <div className="login-header">
                    <img src="/logo.png" alt="EvalCore" className="login-logo" />
                    <h2 className="text-gradient">EvalCore</h2>
                    <p className="text-secondary">Enterprise Student Evaluation</p>
                </div>

                {error && (
                    <div className="error-banner">
                        <span className="icon">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Email Access</label>
                        <input
                            type="email"
                            placeholder="name@unicomtic.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label>Secure Password</label>
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
                        className="btn btn-primary w-full mt-4"
                        disabled={loading}
                    >
                        {loading ? '⏳ Authenticating...' : 'Sign In to Dashboard →'}
                    </button>
                </form>

                <div className="login-footer">
                    Student Evaluation System v2.0
                </div>
            </div>

            <style jsx>{`
                .login-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 1.5rem;
                    position: relative;
                    overflow: hidden;
                    background: var(--bg-gradient);
                }

                .ambient-orb {
                    position: fixed;
                    border-radius: 50%;
                    filter: blur(80px);
                    pointer-events: none;
                    z-index: 0;
                    opacity: 0.5;
                }

                .orb-1 {
                    top: 10%;
                    left: 5%;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, var(--accent-light), transparent 70%);
                }

                .orb-2 {
                    bottom: 10%;
                    right: 5%;
                    width: 350px;
                    height: 350px;
                    background: radial-gradient(circle, var(--accent-glow), transparent 70%);
                }

                .login-card {
                    width: 100%;
                    max-width: 440px;
                    padding: 3rem 2.5rem;
                    z-index: 1;
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                }

                .login-logo {
                    height: 64px;
                    width: auto;
                    margin: 0 auto 1rem;
                    filter: drop-shadow(0 0 15px var(--accent-glow));
                }

                .text-gradient {
                    font-size: 2.2rem;
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                }

                .error-banner {
                    margin-bottom: 1.5rem;
                    padding: 0.85rem 1rem;
                    background: rgba(255, 180, 171, 0.1);
                    border: 1px solid rgba(255, 180, 171, 0.2);
                    border-radius: var(--radius-md);
                    color: var(--danger);
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .form-group label {
                    margin-bottom: 0.6rem;
                    color: var(--text-tertiary);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                .login-footer {
                    text-align: center;
                    margin-top: 2rem;
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    letter-spacing: 0.02em;
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}
