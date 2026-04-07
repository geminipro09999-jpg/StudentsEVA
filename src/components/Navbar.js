"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!session) return null;

    return (
        <nav className="navbar animate-fade-in">
            <div className="logo">
                <span style={{ fontSize: '1.5rem', display: 'inline-block', transform: 'rotate(-10deg)' }}>✨</span>
                <Link href="/dashboard" style={{ color: 'inherit' }}>EvalCore</Link>
            </div>
            <div className="nav-links">
                <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
                {session.user.role === 'admin' && (
                    <>
                        <Link href="/students/add" className={`nav-link ${pathname === '/students/add' ? 'active' : ''}`}>Add Student</Link>
                        <Link href="/users/add" className={`nav-link ${pathname === '/users/add' ? 'active' : ''}`}>Add User</Link>
                    </>
                )}
                {session.user.role === 'lecturer' && (
                    <Link href="/feedback/add" className={`nav-link ${pathname === '/feedback/add' ? 'active' : ''}`}>Add Feedback</Link>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--card-border)', paddingLeft: '1rem' }}>
                    {mounted && (
                        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn btn-secondary" style={{ padding: '0.4rem', fontSize: '1rem', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Toggle Theme">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    )}
                    <span className={`badge ${session.user.role === 'admin' ? 'badge-admin' : 'badge-lecturer'}`}>
                        {session.user.role}
                    </span>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
