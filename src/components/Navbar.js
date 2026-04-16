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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!session) return null;

    return (
        <nav className="navbar animate-fade-in">
            <div className="logo">
                <span>✨</span>
                <Link href="/dashboard">EvalCore</Link>
            </div>

            <button
                className="hamburger"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation"
            >
                {isMobileMenuOpen ? '✕' : '☰'}
            </button>

            <div className={`nav-links ${isMobileMenuOpen ? 'mobile-nav flex' : 'desktop-nav'}`}>
                <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                {session.user.role === 'admin' && (
                    <>
                        <Link href="/students/add" className={`nav-link ${pathname === '/students/add' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Add Student</Link>
                        <Link href="/users/add" className={`nav-link ${pathname === '/users/add' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Add User</Link>
                        <Link href="/reports" className={`nav-link ${pathname === '/reports' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Reports</Link>
                        <Link href="/labs-setup" className={`nav-link ${pathname === '/labs-setup' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Manage Lab Layout</Link>
                    </>
                )}
                {session.user.role === 'lecturer' && (
                    <Link href="/feedback/add" className={`nav-link ${pathname === '/feedback/add' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Add Feedback</Link>
                )}

                <div className="flex items-center gap-4 ml-4">
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="btn btn-secondary py-2 px-4"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    )}
                    <span className={`badge ${session.user.role === 'admin' ? 'badge-admin' : 'badge-lecturer'}`}>
                        {session.user.role}
                    </span>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-secondary py-2 px-4">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
