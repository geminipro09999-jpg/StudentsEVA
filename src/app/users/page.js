"use client";
import { useEffect, useState } from "react";
import { getUsers } from "@/app/actions/usersActions";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import EditRolesModal from "@/components/EditRolesModal";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [editingRolesUser, setEditingRolesUser] = useState(null);
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (!session || session.user.role !== 'admin') {
            router.push("/dashboard");
            return;
        }
        fetchUsers();
    }, [session, status]);

    async function fetchUsers() {
        setLoading(true);
        const res = await getUsers();
        if (res.error) {
            setError(res.error);
        } else {
            setUsers(res.data);
        }
        setLoading(false);
    }

    if (status === "loading" || loading) {
        return <div className="container mt-4 text-center">Loading users...</div>;
    }

    return (
        <div className="container mt-4 animate-fade-in">
            <div className="d-flex justify-between items-center mb-4">
                <div>
                    <h2 style={{ fontSize: '2rem' }}>User Management</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>View and manage system users (Admins & Lecturers)</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/users/add" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>➕</span> Create New User
                    </Link>
                    <Link href="/dashboard" className="btn btn-secondary">← Back</Link>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                    {error}
                </div>
            )}

            <div className="glass-card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: '500' }}>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td className="flex gap-1 flex-wrap">
                                        {(u.roles || [u.role]).map((r, i) => (
                                            <span key={i} className="badge" style={{
                                                background: r === 'admin' ? 'rgba(239, 68, 68, 0.1)' : r === 'incubator_staff' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                color: r === 'admin' ? 'var(--danger)' : r === 'incubator_staff' ? 'var(--accent-color)' : 'var(--success)',
                                                fontSize: '0.65rem',
                                                padding: '0.2rem 0.5rem'
                                            }}>
                                                {r.toUpperCase().replace('_', ' ')}
                                            </span>
                                        ))}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedUser(u)}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                        >
                                            Reset PW
                                        </button>
                                        <button
                                            onClick={() => setEditingRolesUser(u)}
                                            className="btn btn-primary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}
                                        >
                                            Edit Roles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedUser && (
                <ChangePasswordModal
                    user={selectedUser}
                    onClose={() => {
                        setSelectedUser(null);
                        fetchUsers();
                    }}
                />
            )}

            {editingRolesUser && (
                <EditRolesModal
                    user={editingRolesUser}
                    onClose={() => {
                        setEditingRolesUser(null);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}
