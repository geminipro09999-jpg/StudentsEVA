"use client";

import { useState } from "react";
import { createViva } from "@/app/actions/vivaActions";
import toast from "react-hot-toast";

export default function VivaFormModal({ potentialPanelists }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        criteria: [
            { name: "Technical", max_marks: 50, is_required: true, admin_only: false }, 
            { name: "Communication", max_marks: 50, is_required: true, admin_only: false }
        ],
        panelists: []
    });

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
        const newPanelists = formData.panelists.includes(userId)
            ? formData.panelists.filter(id => id !== userId)
            : [...formData.panelists, userId];
        setFormData({ ...formData, panelists: newPanelists });
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

        setLoading(true);
        const res = await createViva(formData);
        if (res.success) {
            toast.success("Viva event created successfully");
            setIsOpen(false);
            setFormData({
                name: "",
                date: "",
                deadline: "",
                criteria: [
                    { name: "Technical", max_marks: 50, is_required: true, admin_only: false }, 
                    { name: "Communication", max_marks: 50, is_required: true, admin_only: false }
                ],
                panelists: []
            });
        } else {
            toast.error(res.error || "Failed to create Viva");
        }
        setLoading(false);
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="btn btn-primary shadow-glow px-6">
                <span className="text-lg">+</span> Create New Viva
            </button>

            {isOpen && (
                <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-card-border">
                            <div>
                                <h3 className="text-2xl font-bold bg-primary-gradient bg-clip-text text-transparent">New Evaluation Session</h3>
                                <p className="text-secondary text-sm mt-1">Define the parameters for your upcoming Viva.</p>
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
                                                <label className="text-[10px] opacity-70">Weight</label>
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
                                <div className="flex items-center gap-2 text-accent-color mb-4">
                                    <span className="text-xl">👥</span>
                                    <h4 className="text-sm font-bold uppercase tracking-widest m-0">Assigned Panelists</h4>
                                </div>
                                
                                <div className="relative">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {formData.panelists.map(id => {
                                            const p = potentialPanelists.find(u => u.id === id);
                                            return p ? (
                                                <div key={id} className="flex items-center gap-2 bg-accent-glow text-accent-color px-3 py-1.5 rounded-full text-xs font-bold animate-fade-in border border-accent-color/20">
                                                    <span>{p.name}</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => togglePanelist(id)}
                                                        className="hover:text-danger transition-colors ml-1"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ) : null;
                                        })}
                                        {formData.panelists.length === 0 && (
                                            <p className="text-tertiary text-xs italic py-2">No panelists selected yet.</p>
                                        )}
                                    </div>
                                    
                                    <select 
                                        className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent-color transition-all cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                togglePanelist(e.target.value);
                                                e.target.value = ""; // Reset
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="" disabled>Choose panelists to add...</option>
                                        {potentialPanelists
                                            .filter(u => !formData.panelists.includes(u.id))
                                            .map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.roles?.[0] || 'Lecturer'})
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <p className="text-[10px] text-tertiary mt-2 ml-1">Select multiple panelists from the dropdown to assign them to this Viva.</p>
                                </div>
                            </div>

                            {/* Final Actions */}
                            <div className="flex justify-end gap-4 pt-8 border-t border-card-border">
                                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary px-8">Cancel</button>
                                <button type="submit" disabled={loading} className="btn btn-primary px-10 shadow-glow">
                                    {loading ? "Orchestrating..." : "Deploy Viva Session"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
