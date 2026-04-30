import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getVivas, deleteViva } from "@/app/actions/vivaActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import VivaFormModal from "@/components/VivaFormModal";
import QuizImportModal from "@/components/QuizImportModal";
import DeleteVivaButton from "@/components/DeleteVivaButton";
import { getUsers } from "@/app/actions/usersActions";

export default async function VivasPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const roles = session.user.roles || [session.user.role];
    const isAdmin = roles.some(r => ['admin', 'administrator'].includes(r));
    
    const { data: vivas, error } = await getVivas();
    
    let potentialPanelists = [];
    if (isAdmin) {
        const { data: users } = await getUsers();
        potentialPanelists = users || [];
    }

    return (
        <div className="container animate-fade-in mt-4">
            <div className="page-hero flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-primary-gradient bg-clip-text text-transparent">Viva Events</h2>
                    <p className="text-secondary">Orchestrate evaluation sessions and manage panelist assignments.</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-3">
                        <QuizImportModal />
                        <VivaFormModal potentialPanelists={potentialPanelists} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                {vivas?.map((viva, index) => (
                    <div key={viva.id} className={`card hover-glow stagger-${(index % 4) + 1} animate-fade-in-scale`} style={{ borderLeft: '4px solid var(--accent-color)' }}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-xl">
                                    🎤
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight m-0">{viva.name}</h3>
                                    <p className="text-secondary text-xs uppercase tracking-wider font-semibold mt-1">
                                        📅 {new Date(viva.viva_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-8 p-4 bg-surface-container-low rounded-xl border border-card-border flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-secondary">
                                <span className="text-lg">📈</span>
                                <div>
                                    <p className="text-xs uppercase font-bold text-tertiary">Metrics</p>
                                    <p className="font-medium text-primary">{viva.criteria?.length || 0} Criteria Assigned</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <Link 
                                href={isAdmin ? `/vivas/${viva.id}` : `/viva-scoring/${viva.id}`} 
                                className="btn btn-primary flex-1 py-3"
                            >
                                {isAdmin ? '⚙️ Manage Event' : '📝 Score Students'}
                            </Link>
                            {isAdmin && (
                                <DeleteVivaButton vivaId={viva.id} />
                            )}
                        </div>
                    </div>
                ))}
                
                {(!vivas || vivas.length === 0) && (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 glass-card border-dashed">
                        <div className="text-6xl mb-4 opacity-20">📭</div>
                        <h3 className="text-xl font-bold text-secondary">No Viva Events Found</h3>
                        <p className="text-tertiary">Create your first evaluation session to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
