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

    const roles = session.user.roles || [session.user.role];
    const isPureStaff = roles.includes('incubator_staff') && roles.length === 1;

    return (
        <>
            <nav className="navbar animate-fade-in">
                <div className="logo">
                    <img src="/logo.png" alt="EvalCore" style={{ height: '32px', width: 'auto' }} />
                    <Link href={isPureStaff ? "/timesheet/invoice" : "/dashboard"}>EvalCore</Link>
                </div>

                {/* Desktop Primary Links */}
                <div className="nav-links desktop-nav">
                    {!isPureStaff && (
                        <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
                    )}
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
                    {(roles.includes('lecturer') || session.user.role === 'lecturer') && (
                        <>
                            <Link href="/feedback/add" className={`nav-link ${pathname === '/feedback/add' ? 'active' : ''}`}>Add Feedback</Link>
                            <Link href="/timesheet" className={`nav-link ${pathname === '/timesheet' ? 'active' : ''}`}>Timesheet</Link>
                        </>
                    )}
                    {roles.includes('incubator_staff') && (
                        <>
                            <Link href="/timesheet/invoice" className={`nav-link ${pathname.includes('invoice') ? 'active' : ''}`}>Invoices</Link>
                            <Link href="/profile" className={`nav-link ${pathname === '/profile' ? 'active' : ''}`}>Profile</Link>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <div className="nav-actions-desktop flex items-center gap-4">
                        {mounted && (
                            <Link href="/profile" className="btn btn-secondary py-2 px-4" title="My Profile">
                                👤 Profile
                            </Link>
                        )}
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="btn btn-secondary py-2 px-4"
                                title="Toggle Theme"
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        )}
                        <div className="flex gap-1">
                            {roles.map((r, i) => (
                                <span key={i} className={`badge ${r === 'admin' ? 'badge-admin' : 'badge-lecturer'}`} style={{ fontSize: '0.6rem' }}>
                                    {r}
                                </span>
                            ))}
                        </div>
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
                {isPureStaff ? (
                    <>
                        <Link href="/timesheet/invoice" className={`bottom-nav-item ${pathname.includes('invoice') ? 'active' : ''}`}>
                            <span className="icon">🧾</span>
                            <span>Invoice</span>
                        </Link>
                        <Link href="/profile" className={`bottom-nav-item ${pathname === '/profile' ? 'active' : ''}`}>
                            <span className="icon">👤</span>
                            <span>Profile</span>
                        </Link>
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </>
    );
}
