"use client";

import { useState } from "react";
import { updateStudent } from "@/app/actions/updateStudent";
import { useRouter } from "next/navigation";

export default function EditStudentForm({ student }) {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(student.status || "active");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        formData.append("id", student.id);

        const res = await updateStudent(formData);

        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {error && (
                <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid grid-cols-2 gap-1">
                    <div>
                        <label>Student ID (UT Number)</label>
                        <input name="student_id" defaultValue={student.student_id} required />
                    </div>
                    <div>
                        <label>Full Name</label>
                        <input name="name" defaultValue={student.name} required />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                    <div>
                        <label>Course</label>
                        <input name="course" defaultValue={student.course} required />
                    </div>
                    <div>
                        <label>Batch</label>
                        <input name="batch" defaultValue={student.batch} required />
                    </div>
                </div>

                <div>
                    <label>Group</label>
                    <select name="group_name" defaultValue={student.group_name || ""}>
                        <option value="">No Group</option>
                        <option value="Group A">Group A</option>
                        <option value="Group B">Group B</option>
                    </select>
                </div>

                <div>
                    <label>Photo URL</label>
                    <input name="photo_url" defaultValue={student.photo_url} placeholder="https://example.com/photo.jpg" />
                </div>

                {/* ── Status Section ────────────────────────────── */}
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
                    <label>Student Status</label>
                    <select
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                            borderColor: status === 'discontinued' ? 'var(--danger)' : undefined,
                            color: status === 'discontinued' ? 'var(--danger)' : undefined,
                        }}
                    >
                        <option value="active">🟢 Active</option>
                        <option value="discontinued">🔴 Discontinued</option>
                    </select>
                </div>

                {status === 'discontinued' && (
                    <div
                        style={{
                            background: 'rgba(239,68,68,0.07)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}
                    >
                        <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, fontWeight: '500' }}>
                            ⚠️ You are marking this student as Discontinued. This student will be excluded from the active directory and appear in the Discontinued Report.
                        </p>
                        <div>
                            <label>Reason for Discontinuation <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <textarea
                                name="discontinue_reason"
                                defaultValue={student.discontinue_reason || ""}
                                placeholder="e.g. Student withdrew due to personal reasons, transferred to another institution..."
                                required={status === 'discontinued'}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                    </div>
                )}

                <div className="d-flex gap-1 mt-2">
                    <button type="button" onClick={() => router.back()} className="btn btn-secondary flex-1" style={{ padding: '0.8rem' }}>
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary flex-1" style={{ padding: '0.8rem' }}>
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
