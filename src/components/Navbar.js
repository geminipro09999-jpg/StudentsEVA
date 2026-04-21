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
        <>
            <nav className="navbar animate-fade-in">
                <div className="logo">
                    <img src="/logo.png" alt="EvalCore" style={{ height: '32px', width: 'auto' }} />
                    <Link href="/dashboard">EvalCore</Link>
                </div>

                {/* Desktop Primary Links */}
                <div className="nav-links desktop-nav">
                    <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
                    {session.user.role === 'admin' && (
                        <>
                            <Link href="/students/add" className={`nav-link ${pathname === '/students/add' ? 'active' : ''}`}>Add Student</Link>
                            <Link href="/attendance" className={`nav-link ${pathname === '/attendance' ? 'active' : ''}`}>Attendance</Link>
                            <Link href="/timesheet" className={`nav-link ${pathname === '/timesheet' ? 'active' : ''}`}>Timesheet</Link>
                            <Link href="/labs-setup" className={`nav-link ${pathname === '/labs-setup' ? 'active' : ''}`}>Labs</Link>
                            <Link href="/users" className={`nav-link ${pathname === '/users' ? 'active' : ''}`}>Users</Link>
                            <Link href="/reports" className={`nav-link ${pathname === '/reports' ? 'active' : ''}`}>Reports</Link>
                        </>
                    )}
                    {session.user.role === 'lecturer' && (
                        <>
                            <Link href="/feedback/add" className={`nav-link ${pathname === '/feedback/add' ? 'active' : ''}`}>Add Feedback</Link>
                            <Link href="/timesheet" className={`nav-link ${pathname === '/timesheet' ? 'active' : ''}`}>Timesheet</Link>
                        </>
                    )}
                </div>

                {/* Actions (Both Desktop & Mobile) */}
                <div className="flex items-center gap-4">
                    <div className="nav-actions-desktop flex items-center gap-4">
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

                    <div className="nav-actions-mobile hidden items-center gap-3">
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="btn btn-secondary p-2 min-w-0"
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        )}
                        <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-secondary p-2 min-w-0">
                            🚪
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <div className="bottom-nav">
                <Link href="/dashboard" className={`bottom-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
                    <span className="icon">🏠</span>
                    <span>Home</span>
                </Link>

                {session.user.role === 'admin' ? (
                    <>
                        <Link href="/students/add" className={`bottom-nav-item ${pathname === '/students/add' ? 'active' : ''}`}>
                            <span className="icon">➕</span>
                            <span>Add</span>
                        </Link>
                        <Link href="/attendance" className={`bottom-nav-item ${pathname === '/attendance' ? 'active' : ''}`}>
                            <span className="icon">📅</span>
                            <span>Attendance</span>
                        </Link>
                        <Link href="/timesheet" className={`bottom-nav-item ${pathname === '/timesheet' ? 'active' : ''}`}>
                            <span className="icon">⏱️</span>
                            <span>Times</span>
                        </Link>
                        <Link href="/labs-setup" className={`bottom-nav-item ${pathname === '/labs-setup' ? 'active' : ''}`}>
                            <span className="icon">🧪</span>
                            <span>Labs</span>
                        </Link>
                        <Link href="/reports" className={`bottom-nav-item ${pathname === '/reports' ? 'active' : ''}`}>
                            <span className="icon">📊</span>
                            <span>Reports</span>
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/feedback/add" className={`bottom-nav-item ${pathname === '/feedback/add' ? 'active' : ''}`}>
                            <span className="icon">📝</span>
                            <span>Feedback</span>
                        </Link>
                        <Link href="/timesheet" className={`bottom-nav-item ${pathname === '/timesheet' ? 'active' : ''}`}>
                            <span className="icon">⏱️</span>
                            <span>Times</span>
                        </Link>
                    </>
                )}
            </div>
        </>
    );
}
