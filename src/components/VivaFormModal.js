"use client";

import { useState, useEffect } from "react";
import { createViva, updateViva } from "@/app/actions/vivaActions";
import toast from "react-hot-toast";

export default function VivaFormModal({ potentialPanelists, editMode = false, initialData = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [panelistSearchQuery, setPanelistSearchQuery] = useState("");
    const [showPanelistDropdown, setShowPanelistDropdown] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        is_active: true,
        criteria: [
            { name: "Technical", max_marks: 50, is_required: true, admin_only: false }, 
            { name: "Communication", max_marks: 50, is_required: true, admin_only: false }
        ],
        panelists: []
    });

    useEffect(() => {
        if (editMode && initialData && isOpen) {
            setFormData({
                name: initialData.name || "",
                date: initialData.viva_date ? new Date(initialData.viva_date).toISOString().split('T')[0] : "",
                is_active: initialData.is_active !== false,
                criteria: initialData.criteria || [],
                panelists: initialData.panelists || []
            });
        }
    }, [editMode, initialData, isOpen]);

    const addCriteria = () => {
        setFormData({
            ...formData,
            criteria: [...formData.criteria, { name: "", max_marks: 10, is_required: true, admin_only: false }]
        });
    };

    const removeCriteria = (index) => {
        setFormData({
            ...formData,
            criteria: formData.criteria.filter((_, i) => i !== index)
        });
    };

    const updateCriteria = (index, field, value) => {
        const newCriteria = [...formData.criteria];
        if (field === 'max_marks') {
            const parsed = parseInt(value);
            newCriteria[index][field] = isNaN(parsed) ? 0 : parsed;
        } else {
            newCriteria[index][field] = value;
        }
        setFormData({ ...formData, criteria: newCriteria });
    };

    const togglePanelist = (userId) => {
        const exists = formData.panelists.find(p => p.user_id === userId);
        let newPanelists;
        if (exists) {
            newPanelists = formData.panelists.filter(p => p.user_id !== userId);
        } else {
            newPanelists = [...formData.panelists, { user_id: userId, weight: 0 }];
        }
        
        // Auto-distribute weights evenly if they are all 0 or if it's the first one
        if (newPanelists.length > 0) {
            const evenWeight = Math.floor(100 / newPanelists.length);
            newPanelists = newPanelists.map((p, i) => ({
                ...p,
                weight: i === newPanelists.length - 1 ? 100 - (evenWeight * (newPanelists.length - 1)) : evenWeight
            }));
        }

        setFormData({ ...formData, panelists: newPanelists });
    };

    const updatePanelistWeight = (userId, weight) => {
        const parsedWeight = parseFloat(weight) || 0;
        setFormData({
            ...formData,
            panelists: formData.panelists.map(p => 
                p.user_id === userId ? { ...p, weight: parsedWeight } : p
            )
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.date) {
            return toast.error("Please fill all required fields");
        }
        if (formData.criteria.length === 0) {
            return toast.error("Please add at least one criteria");
        }
        if (formData.panelists.length === 0) {
            return toast.error("Please select at least one panelist");
        }

        const totalWeight = formData.panelists.reduce((sum, p) => sum + p.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            return toast.error(`Total panelist weight must be 100%. Current: ${totalWeight}%`);
        }

        setLoading(true);
        let res;
        if (editMode && initialData) {
            res = await updateViva(initialData.id, formData);
        } else {
            res = await createViva(formData);
        }

        if (res.success) {
            toast.success(editMode ? "Viva event updated successfully" : "Viva event created successfully");
            setIsOpen(false);
            if (!editMode) {
                setFormData({
                    name: "",
                    date: "",
                    is_active: true,
                    criteria: [
                        { name: "Technical", max_marks: 50, is_required: true, admin_only: false }, 
                        { name: "Communication", max_marks: 50, is_required: true, admin_only: false }
                    ],
                    panelists: []
                });
            }
        } else {
            toast.error(res.error || (editMode ? "Failed to update Viva" : "Failed to create Viva"));
        }
        setLoading(false);
    };

    const totalWeight = formData.panelists.reduce((sum, p) => sum + p.weight, 0);

    return (
        <>
            <button onClick={() => setIsOpen(true)} className={editMode ? "btn py-2 px-4 btn-secondary text-sm" : "btn btn-primary shadow-glow px-6"}>
                {editMode ? "✏️ Edit Event" : <><span className="text-lg">+</span> Create New Viva</>}
            </button>

            {isOpen && (
                <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-card-border">
                            <div>
                                <h3 className="text-2xl font-bold bg-primary-gradient bg-clip-text text-transparent">
                                    {editMode ? "Edit Evaluation Session" : "New Evaluation Session"}
                                </h3>
                                <p className="text-secondary text-sm mt-1">
                                    {editMode ? "Update the parameters for this Viva session." : "Define the parameters for your upcoming Viva."}
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="btn-close">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Section: Event Details */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-accent-color mb-4">
                                    <span className="text-xl">📅</span>
                                    <h4 className="text-sm font-bold uppercase tracking-widest m-0">Event Logistics</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label>Viva Title</label>
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            placeholder="e.g., Final Year Defense"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label>Scheduled Date</label>
                                        <input 
                                            type="date" 
                                            value={formData.date} 
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-card-border">
                                        <div>
                                            <p className="font-bold text-sm m-0">Active Session</p>
                                            <p className="text-xs text-secondary mt-1">If inactive, this Viva will be hidden from assigned panelists.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                            />
                                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Scoring Criteria */}
                            <div className="space-y-4 pt-6 border-t border-card-border">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2 text-accent-color">
                                        <span className="text-xl">📊</span>
                                        <h4 className="text-sm font-bold uppercase tracking-widest m-0">Scoring Framework</h4>
                                    </div>
                                    <button type="button" onClick={addCriteria} className="btn btn-secondary py-1.5 px-4 text-xs font-bold">
                                        + Add Metric
                                    </button>
                                </div>
                                <div className="grid gap-4">
                                    {formData.criteria.map((c, index) => (
                                        <div key={index} className="flex gap-4 items-end animate-fade-in">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] opacity-70">Metric Name</label>
                                                <input 
                                                    type="text" 
                                                    value={c.name} 
                                                    onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                                                    placeholder="Technical Proficiency"
                                                    className="bg-surface-container-high border-none"
                                                />
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <label className="text-[10px] opacity-70">Max Marks</label>
                                                <input 
                                                    type="number" 
                                                    value={c.max_marks} 
                                                    onChange={(e) => updateCriteria(index, 'max_marks', e.target.value)}
                                                    placeholder="100"
                                                    className="bg-surface-container-high border-none text-center"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center gap-1 mb-2">
                                                <label className="text-[10px] opacity-70">Required</label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={c.is_required !== false} 
                                                    onChange={(e) => updateCriteria(index, 'is_required', e.target.checked)}
                                                    className="w-5 h-5 accent-accent-color cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center gap-1 mb-2">
                                                <label className="text-[10px] opacity-70 text-primary font-bold">Admin Only</label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={c.admin_only || false} 
                                                    onChange={(e) => updateCriteria(index, 'admin_only', e.target.checked)}
                                                    className="w-5 h-5 accent-primary cursor-pointer"
                                                />
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => removeCriteria(index)}
                                                className="btn btn-secondary text-danger hover:bg-danger/5 border-none h-[42px] px-3"
                                                disabled={formData.criteria.length === 1}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Panelists */}
                            <div className="space-y-4 pt-6 border-t border-card-border">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2 text-accent-color">
                                        <span className="text-xl">👥</span>
                                        <h4 className="text-sm font-bold uppercase tracking-widest m-0">Assigned Panelists</h4>
                                    </div>
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${Math.abs(totalWeight - 100) < 0.1 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                        Total Weight: {totalWeight}%
                                    </div>
                                </div>
                                
                                <div className="relative">
                                    <div className="flex flex-col gap-3 mb-4">
                                        {formData.panelists.map(panelist => {
                                            const p = potentialPanelists.find(u => u.id === panelist.user_id);
                                            return p ? (
                                                <div key={panelist.user_id} className="flex items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-card-border animate-fade-in">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold m-0">{p.name}</p>
                                                        <p className="text-[10px] text-tertiary">{p.roles?.[0] || 'Lecturer'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-[10px] uppercase font-bold text-tertiary">Weight:</label>
                                                        <div className="relative w-20">
                                                            <input 
                                                                type="number" 
                                                                value={panelist.weight}
                                                                onChange={(e) => updatePanelistWeight(panelist.user_id, e.target.value)}
                                                                className="bg-surface-container-highest border-none text-right pr-6 py-1 text-sm font-bold"
                                                                min="0"
                                                                max="100"
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-50">%</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => togglePanelist(panelist.user_id)}
                                                        className="btn btn-secondary text-danger border-none p-2"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ) : null;
                                        })}
                                        {formData.panelists.length === 0 && (
                                            <p className="text-tertiary text-xs italic py-2">No panelists selected yet. Add them from the dropdown below.</p>
                                        )}
                                    </div>
                                    
                                    {/* Searchable Panelist Dropdown */}
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            placeholder="🔍 Search and choose panelists to add..."
                                            value={panelistSearchQuery}
                                            onChange={(e) => {
                                                setPanelistSearchQuery(e.target.value);
                                                setShowPanelistDropdown(true);
                                            }}
                                            onFocus={() => setShowPanelistDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowPanelistDropdown(false), 200)}
                                            className="w-full bg-surface-container-high border border-card-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent-color transition-all"
                                        />
                                        {showPanelistDropdown && (
                                            <div className="absolute z-50 w-full mt-2 bg-surface-container-high border border-card-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                {potentialPanelists
                                                    .filter(u => !formData.panelists.find(p => p.user_id === u.id))
                                                    .filter(u => u.name.toLowerCase().includes(panelistSearchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(panelistSearchQuery.toLowerCase())))
                                                    .map(user => (
                                                        <div 
                                                            key={user.id} 
                                                            className="p-3 hover:bg-surface-container-highest cursor-pointer border-b border-card-border/50 last:border-0 flex flex-col"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent blur
                                                                togglePanelist(user.id);
                                                                setPanelistSearchQuery("");
                                                                setShowPanelistDropdown(false);
                                                            }}
                                                        >
                                                            <span className="text-sm font-bold">{user.name}</span>
                                                            <span className="text-[10px] text-tertiary">{user.email} • {user.roles?.[0] || 'Lecturer'}</span>
                                                        </div>
                                                    ))
                                                }
                                                {potentialPanelists
                                                    .filter(u => !formData.panelists.find(p => p.user_id === u.id))
                                                    .filter(u => u.name.toLowerCase().includes(panelistSearchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(panelistSearchQuery.toLowerCase()))).length === 0 && (
                                                    <div className="p-3 text-center text-secondary text-xs italic">
                                                        No available panelists found matching "{panelistSearchQuery}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-tertiary mt-2 ml-1">Assign multiple panelists and define their scoring weight (must total 100%).</p>
                                </div>
                            </div>

                            {/* Final Actions */}
                            <div className="flex justify-end gap-4 pt-8 border-t border-card-border">
                                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary px-8">Cancel</button>
                                <button type="submit" disabled={loading} className="btn btn-primary px-10 shadow-glow">
                                    {loading ? "Saving..." : (editMode ? "Save Changes" : "Deploy Viva Session")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
