"use client";

import { useState } from "react";
import { addStudent } from "@/app/actions/addStudent";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AddStudentPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const res = await addStudent(formData);

        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError("");

        try {
            const XLSX = await import("xlsx");
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        setError("The Excel file is empty.");
                        setLoading(false);
                        return;
                    }

                    const { addStudentsBulk } = await import("@/app/actions/addStudentsBulk");
                    const res = await addStudentsBulk(jsonData);

                    if (res.error) {
                        setError(res.error);
                    } else {
                        router.push("/dashboard");
                    }
                } catch (err) {
                    setError("Failed to parse data payload natively.");
                }
                setLoading(false);
            };

            reader.readAsArrayBuffer(file);
        } catch (err) {
            setError("Failed to initialize Excel parser.");
            setLoading(false);
        }
    };

    if (session?.user?.role !== 'admin') {
        return (
            <div className="container animate-fade-in mt-4 text-center">
                <h2>Unauthorized Area</h2>
                <p style={{ color: 'var(--danger)' }}>Only administrators are allowed to create new student profiles.</p>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in mt-4">
            <div className="text-center mb-4">
                <h2>Add New Student</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Register a student in the system manually, or mass-import an Excel file.</p>
            </div>

            <div className="glass-card mb-4" style={{ maxWidth: '600px', margin: '0 auto 2rem auto', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Bulk Import via Excel</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Upload a .xlsx or .csv file with columns: <strong>Student_ID, Name, Course, Batch</strong></p>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {loading ? "Processing..." : "Select Excel Data File"}
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
                </label>
            </div>

            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>Manual Entry</h3>
                {error && (
                    <div className="mb-4 p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="grid grid-cols-2 gap-2" style={{ gap: '1.25rem' }}>
                        <div>
                            <label>Student ID</label>
                            <input type="text" name="student_id" placeholder="e.g. S100234" required />
                        </div>
                        <div>
                            <label>Full Name</label>
                            <input type="text" name="name" placeholder="John Doe" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2" style={{ gap: '1.25rem' }}>
                        <div>
                            <label>Course</label>
                            <input type="text" name="course" placeholder="BSc Computer Science" required />
                        </div>
                        <div>
                            <label>Batch / Year</label>
                            <input type="text" name="batch" placeholder="2026" required />
                        </div>
                    </div>
                    <div>
                        <label>Photo URL (Optional)</label>
                        <input type="url" name="photo_url" placeholder="https://cloudinary.com/..." />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>You can paste a Cloudinary URL here.</p>
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary mt-2" style={{ padding: '1rem' }}>
                        {loading ? "Adding..." : "Add Student"}
                    </button>
                </form>
            </div>
        </div>
    );
}
