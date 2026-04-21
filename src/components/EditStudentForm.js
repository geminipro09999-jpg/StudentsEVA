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
        <div className="glass-card animate-fade-in mx-auto" style={{ maxWidth: '640px' }}>
            <div className="section-header">
                <h2>Edit Student</h2>
                <p>Update profile information and status.</p>
            </div>

            {error && (
                <div className="error-banner mb-6">
                    <span className="icon">⚠️</span> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>Student ID</label>
                        <input name="student_id" defaultValue={student.student_id} required />
                    </div>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="name" defaultValue={student.name} required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>Course Name</label>
                        <input name="course" defaultValue={student.course} required />
                    </div>
                    <div className="form-group">
                        <label>Batch / Intake</label>
                        <input name="batch" defaultValue={student.batch} required />
                    </div>
                </div>

                <div className="form-group">
                    <label>Assigned Group</label>
                    <select name="group_name" defaultValue={student.group_name || ""}>
                        <option value="">No Group Assigned</option>
                        <option value="Group A">Group A</option>
                        <option value="Group B">Group B</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Profile Image URL</label>
                    <input name="photo_url" defaultValue={student.photo_url} placeholder="https://..." />
                </div>

                {/* ── Status Section ────────────────────────────── */}
                <div className="mt-4 pt-6 border-t border-card-border">
                    <label className="text-accent">Institutional Status</label>
                    <select
                        className="mt-2"
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                            borderColor: status === 'discontinued' ? 'var(--danger)' : undefined,
                            color: status === 'discontinued' ? 'var(--danger)' : undefined,
                        }}
                    >
                        <option value="active">🟢 Active Student</option>
                        <option value="discontinued">🔴 Discontinued</option>
                    </select>
                </div>

                {status === 'discontinued' && (
                    <div className="animate-fade-in-scale p-4 rounded-lg bg-danger-light border border-danger-dim">
                        <p className="text-danger text-sm font-medium mb-3">
                            ⚠️ This student will be moved to the archival directory.
                        </p>
                        <div className="form-group">
                            <label>Reason for Removal</label>
                            <textarea
                                name="discontinue_reason"
                                defaultValue={student.discontinue_reason || ""}
                                placeholder="Please provide specific context..."
                                required={status === 'discontinued'}
                                rows={3}
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-4 mt-6">
                    <button type="button" onClick={() => router.back()} className="btn btn-secondary flex-1">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                        {loading ? "Processing..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
