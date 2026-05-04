import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getVivaDetails } from "@/app/actions/vivaActions";
import { getAllScoresForViva } from "@/app/actions/scoringActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminScoreManagement from "@/components/AdminScoreManagement";
import ExportVivaReport from "@/components/ExportVivaReport";
import VivaMetricImportModal from "@/components/VivaMetricImportModal";
import VivaFormModal from "@/components/VivaFormModal";
import { getUsers } from "@/app/actions/usersActions";

export default async function VivaDetailPage({ params, searchParams }) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const currentPage = parseInt(resolvedSearchParams?.page || "1", 10);
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const roles = session.user.roles || [session.user.role];
    const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r));
    if (!isAdmin) redirect("/viva-scoring");

    const { data: viva, error } = await getVivaDetails(id);
    
    let potentialPanelists = [];
    if (isAdmin) {
        const { data: users } = await getUsers();
        potentialPanelists = users || [];
    }
    
    if (!viva) {
        return (
            <div className="container mt-20 text-center">
                <h1 className="text-6xl font-bold opacity-20 mb-4">404</h1>
                <h2 className="text-2xl font-bold mb-8">Viva Session Not Found</h2>
                <Link href="/vivas" className="btn btn-primary px-8">Back to Vivas</Link>
            </div>
        );
    }

    const { data: scores } = await getAllScoresForViva(id);

    const vivaTotal = viva?.criteria.reduce((s, c) => s + c.max_marks, 0) || 0;
    
    // 3. Group scores by student and calculate weighted average
    // panelists is an array of { user_id, weight, users: { name, ... } }
    const panelistWeights = viva?.panelists?.reduce((acc, p) => {
        acc[p.user_id] = p.weight;
        return acc;
    }, {}) || {};

    const groupedScoresMap = scores?.reduce((acc, score) => {
        const studentId = score.student_id;
        const lecturerId = score.lecturer_id;
        
        if (!acc[studentId]) {
            acc[studentId] = {
                student: score.students,
                panelistData: {}, // Store scores per panelist: { [lecturerId]: { [criteriaId]: score } }
                remark: score.remark,
                is_verified: score.is_verified,
                is_locked: score.is_locked,
                updated_at: score.updated_at,
                lecturerId: lecturerId // Representative lecturer ID
            };
        }

        if (!acc[studentId].panelistData[lecturerId]) {
            acc[studentId].panelistData[lecturerId] = {
                name: score.users.name,
                scores: {}
            };
        }

        acc[studentId].panelistData[lecturerId].scores[score.criteria_id] = score.score;
        
        if (new Date(score.updated_at) > new Date(acc[studentId].updated_at)) {
            acc[studentId].updated_at = score.updated_at;
        }

        if (score.is_locked) acc[studentId].is_locked = true;
        if (score.is_verified) acc[studentId].is_verified = true;
        if (score.remark && !acc[studentId].remark) acc[studentId].remark = score.remark;

        return acc;
    }, {});

    // Convert map to array and calculate weighted totals
    const groupedScores = Object.values(groupedScoresMap || {}).map(group => {
        const weightedCriteriaScores = {};
        let finalTotal = 0;

        // For each criteria in the viva
        viva.criteria.forEach(c => {
            let weightedScoreForMetric = 0;
            let weightSumUsed = 0;

            // Aggregate weighted contribution from each panelist who scored this student
            Object.entries(group.panelistData).forEach(([lId, data]) => {
                const score = data.scores[c.id];
                const weight = panelistWeights[lId] || 0;
                
                if (score !== undefined) {
                    weightedScoreForMetric += (score * weight) / 100;
                    weightSumUsed += weight;
                }
            });

            // If some panelists haven't scored yet, we might want to normalize?
            // For now, we use the absolute weighted contribution based on assigned weights.
            weightedCriteriaScores[c.id] = parseFloat(weightedScoreForMetric.toFixed(2));
            finalTotal += weightedScoreForMetric;
        });

        return {
            ...group,
            criteriaScores: weightedCriteriaScores,
            total: parseFloat(finalTotal.toFixed(2)),
            max_total: vivaTotal,
            lecturerName: Object.values(group.panelistData).map(p => p.name).join(', ')
        };
    });

    const totalEvaluations = Object.keys(groupedScores || {}).length;
    const verifiedEvaluations = Object.values(groupedScores || {}).filter(g => g.is_verified).length;

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(totalEvaluations / ITEMS_PER_PAGE) || 1;
    const pageIndex = Math.max(1, Math.min(currentPage, totalPages));
    const paginatedScores = groupedScores.slice((pageIndex - 1) * ITEMS_PER_PAGE, pageIndex * ITEMS_PER_PAGE);

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
                            <div className={`badge ${viva?.is_active !== false ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                                {viva?.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                        </div>
                        <p className="text-secondary mt-1 flex items-center gap-2">
                            <span>📅 Scheduled: <strong>{new Date(viva?.viva_date).toLocaleDateString(undefined, { dateStyle: 'full' })}</strong></span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <VivaFormModal editMode={true} initialData={viva} potentialPanelists={potentialPanelists} />
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
                    <p className="text-xs text-secondary mt-2">Unique students evaluated</p>
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
                    <p className="text-xs text-secondary mt-2">Overall cohort weighted performance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <div className="card h-full">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="text-accent-color">📋</span> Weighted Evaluation Ledger
                            </h3>
                            <div className="text-[10px] uppercase tracking-widest text-tertiary">
                                Scores are calculated based on assigned panelist weights
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Panelists</th>
                                        {viva?.criteria.map(c => (
                                            <th key={c.id}>{c.name}</th>
                                        ))}
                                        <th>Weighted Total</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedScores.map((group, idx) => (
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
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.values(group.panelistData).map((p, pi) => (
                                                        <span key={pi} className="text-[10px] bg-surface-container-highest px-1.5 py-0.5 rounded">
                                                            {p.name}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-tertiary mt-1">Last updated: {new Date(group.updated_at).toLocaleDateString()}</p>
                                            </td>
                                            {/* Weighted Individual Scores */}
                                            {viva.criteria.map(c => (
                                                <td key={c.id} className="text-sm font-medium">
                                                    {group.criteriaScores[c.id]}
                                                    <span className="text-[10px] text-tertiary ml-1">/{c.max_marks}</span>
                                                </td>
                                            ))}
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-accent-color">{group.total} / {group.max_total}</span>
                                                    <span className="text-[10px] text-secondary">({(group.total / group.max_total * 100).toFixed(1)}%)</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`badge ${group.is_locked ? 'badge-admin' : 'badge-lecturer'}`} style={{ fontSize: '10px' }}>
                                                    {group.is_locked ? (group.is_verified ? 'VERIFIED' : 'SUBMITTED') : 'DRAFT'}
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
                                                    panelistData={group.panelistData}
                                                    panelistWeights={panelistWeights}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {totalEvaluations === 0 && (
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

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 border-t border-card-border pt-4">
                                <span className="text-xs text-secondary">
                                    Showing <span className="font-bold text-accent-color">{((pageIndex - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-bold text-accent-color">{Math.min(pageIndex * ITEMS_PER_PAGE, totalEvaluations)}</span> of <span className="font-bold text-accent-color">{totalEvaluations}</span> entries
                                </span>
                                <div className="flex gap-2">
                                    {pageIndex > 1 ? (
                                        <Link href={`/vivas/${id}?page=${pageIndex - 1}`} className="btn btn-secondary py-1 px-3 text-xs font-bold border border-card-border/50">
                                            Previous
                                        </Link>
                                    ) : (
                                        <button disabled className="btn btn-secondary py-1 px-3 text-xs font-bold border border-card-border/50 opacity-50 cursor-not-allowed">Previous</button>
                                    )}
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <Link 
                                            key={page} 
                                            href={`/vivas/${id}?page=${page}`}
                                            className={`btn py-1 px-3 text-xs font-bold border transition-colors ${page === pageIndex ? 'bg-accent-glow text-accent-color border-accent-color/50' : 'btn-secondary border-card-border/50 hover:bg-surface-container-high'}`}
                                        >
                                            {page}
                                        </Link>
                                    ))}

                                    {pageIndex < totalPages ? (
                                        <Link href={`/vivas/${id}?page=${pageIndex + 1}`} className="btn btn-secondary py-1 px-3 text-xs font-bold border border-card-border/50">
                                            Next
                                        </Link>
                                    ) : (
                                        <button disabled className="btn btn-secondary py-1 px-3 text-xs font-bold border border-card-border/50 opacity-50 cursor-not-allowed">Next</button>
                                    )}
                                </div>
                            </div>
                        )}
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
                        <h3 className="text-sm font-bold uppercase tracking-widest text-accent-color mb-4">Panelists & Weights</h3>
                        <div className="space-y-4">
                            {viva?.panelists.map((p) => (
                                <div key={p.user_id} className="flex items-center gap-3 bg-surface-container-low p-2 rounded-lg border border-card-border/50">
                                    <div className="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center font-bold text-[10px] text-surface shrink-0">
                                        {p.users.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <p className="text-xs font-bold truncate m-0">{p.users.name}</p>
                                        <p className="text-[10px] text-tertiary truncate">{p.users.email}</p>
                                    </div>
                                    <div className="text-xs font-bold text-accent-color px-2 py-1 bg-accent-glow rounded-md">
                                        {p.weight}%
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
