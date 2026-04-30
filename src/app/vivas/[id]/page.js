import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getVivaDetails } from "@/app/actions/vivaActions";
import { getAllScoresForViva } from "@/app/actions/scoringActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminScoreManagement from "@/components/AdminScoreManagement";
import ExportVivaReport from "@/components/ExportVivaReport";
import VivaMetricImportModal from "@/components/VivaMetricImportModal";

export default async function VivaDetailPage({ params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const roles = session.user.roles || [session.user.role];
    const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r));
    if (!isAdmin) redirect("/viva-scoring");

    const { data: viva } = await getVivaDetails(id);
    const { data: scores } = await getAllScoresForViva(id);

    const vivaTotal = viva?.criteria.reduce((s, c) => s + c.max_marks, 0) || 0;
    
    // Group scores by student (merge different lecturers like Admin import + Staff entry)
    const groupedScoresMap = scores?.reduce((acc, score) => {
        const studentId = score.student_id;
        
        if (!acc[studentId]) {
            acc[studentId] = {
                student: score.students,
                lecturerNames: new Set(),
                criteriaScores: {},
                remark: score.remark,
                is_verified: score.is_verified,
                is_locked: score.is_locked,
                updated_at: score.updated_at,
                lecturerId: score.lecturer_id // Default lecturer ID for editing
            };
        }

        // Add lecturer name to the set (to display who contributed)
        acc[studentId].lecturerNames.add(score.users.name);
        
        // If this record has more 'viva' like criteria or is from a non-admin, prefer this lecturerId
        // In this project, 'Super Admin' is usually the one importing quiz marks
        if (score.users.name !== 'Super Admin' && score.users.name !== 'admin') {
            acc[studentId].lecturerId = score.lecturer_id;
        }

        // Merge scores
        acc[studentId].criteriaScores[score.criteria_id] = score.score;
        
        // Keep the latest update time
        if (new Date(score.updated_at) > new Date(acc[studentId].updated_at)) {
            acc[studentId].updated_at = score.updated_at;
        }

        // Aggregate status
        if (score.is_locked) acc[studentId].is_locked = true;
        if (score.is_verified) acc[studentId].is_verified = true;
        if (score.remark && !acc[studentId].remark) acc[studentId].remark = score.remark;

        return acc;
    }, {});

    // Convert map to array and finalize display fields
    const groupedScores = Object.values(groupedScoresMap || {}).map(group => {
        const total = Object.values(group.criteriaScores).reduce((sum, s) => sum + s, 0);
        return {
            ...group,
            total,
            max_total: vivaTotal,
            lecturerName: Array.from(group.lecturerNames).join(', ')
        };
    });

    const totalEvaluations = Object.keys(groupedScores || {}).length;
    const verifiedEvaluations = Object.values(groupedScores || {}).filter(g => g.is_verified).length;

    return (
        <div className="container animate-fade-in mt-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 pb-6 border-b border-card-border">
                <Link href="/vivas" className="btn btn-secondary p-3 rounded-xl hover:translate-x-[-4px]">
                    <span className="text-xl">←</span>
                </Link>
                <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-bold bg-primary-gradient bg-clip-text text-transparent">{viva?.name}</h2>
                        </div>
                        <p className="text-secondary mt-1 flex items-center gap-2">
                            <span>📅 Scheduled: <strong>{new Date(viva?.viva_date).toLocaleDateString(undefined, { dateStyle: 'full' })}</strong></span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <VivaMetricImportModal vivaId={id} criteria={viva.criteria} />
                        <ExportVivaReport viva={viva} groupedScores={groupedScores} />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="stat-card accent">
                    <label>Total Evaluations</label>
                    <h3 className="text-3xl font-bold">{totalEvaluations}</h3>
                    <p className="text-xs text-secondary mt-2">Completed by assigned panelists</p>
                </div>
                <div className="stat-card success">
                    <label>Verified Reports</label>
                    <h3 className="text-3xl font-bold text-success">{verifiedEvaluations}</h3>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-3">
                        <div 
                            className="bg-success h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${totalEvaluations > 0 ? (verifiedEvaluations / totalEvaluations) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <label>Average Score</label>
                    <h3 className="text-3xl font-bold text-warning">
                        {totalEvaluations > 0 
                            ? (Object.values(groupedScores).reduce((acc, g) => acc + (g.total / g.max_total), 0) / totalEvaluations * 100).toFixed(1)
                            : 0}%
                    </h3>
                    <p className="text-xs text-secondary mt-2">Overall cohort performance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <div className="card h-full">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-accent-color">📋</span> Evaluation Ledger
                            </h3>
                        </div>

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Lecturer</th>
                                        {viva?.criteria.map(c => (
                                            <th key={c.id}>{c.name}</th>
                                        ))}
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(groupedScores || {}).map((group, idx) => (
                                        <tr key={idx} className="hover:bg-surface-container-high/30">
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-xs">
                                                        {group.student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm m-0">{group.student.name}</p>
                                                        <p className="text-[10px] text-tertiary uppercase tracking-wider">{group.student.student_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-sm m-0">{group.lecturerName}</p>
                                                <p className="text-[10px] text-tertiary">{new Date(group.updated_at).toLocaleDateString()}</p>
                                            </td>
                                            {/* Individual Scores */}
                                            {viva.criteria.map(c => (
                                                <td key={c.id} className="text-sm font-medium">
                                                    {group.criteriaScores[c.id] !== undefined ? group.criteriaScores[c.id] : '—'}
                                                    <span className="text-[10px] text-tertiary ml-1">/{c.max_marks}</span>
                                                </td>
                                            ))}
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{group.total} / {group.max_total}</span>
                                                    <span className="text-[10px] text-secondary">({(group.total / group.max_total * 100).toFixed(0)}%)</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`badge ${group.is_locked ? 'badge-admin' : 'badge-lecturer'}`} style={{ fontSize: '10px' }}>
                                                    {group.is_locked ? 'LOCKED' : 'DRAFT'}
                                                </div>
                                            </td>

                                            <td className="text-right">
                                                <AdminScoreManagement 
                                                    vivaId={id} 
                                                    student={group.student}
                                                    lecturerId={group.lecturerId}
                                                    initialScores={group.criteriaScores}
                                                    initialRemark={group.remark}
                                                    criteria={viva.criteria}
                                                    isVerified={group.is_verified}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {Object.keys(groupedScores || {}).length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-16">
                                                <div className="opacity-20 text-5xl mb-3">📁</div>
                                                <p className="text-secondary italic">No evaluations have been submitted yet.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-accent-color mb-4">Metric Names</h3>
                        <div className="space-y-2">
                            {viva?.criteria.map((c) => (
                                <div key={c.id} className="p-3 rounded-xl bg-surface-container-low border border-card-border flex justify-between items-center">
                                    <span className="text-xs font-semibold">{c.name}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-surface-container-highest rounded-md">{c.max_marks}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-accent-color mb-4">Panel</h3>
                        <div className="space-y-3">
                            {viva?.panelists.map((p) => (
                                <div key={p.user_id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center font-bold text-[10px] text-surface">
                                        {p.users.name.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold truncate m-0">{p.users.name}</p>
                                        <p className="text-[10px] text-tertiary truncate">{p.users.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
