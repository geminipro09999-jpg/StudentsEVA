"use client";

import { useMemo } from "react";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#34d399', '#38bdf8', '#818cf8', '#fbbf24', '#f87171'];
const RATING_LABELS = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Bad" };

export default function DashboardCharts({ feedbacks }) {

    const ratingDistribution = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        feedbacks.forEach(f => {
            if (counts[f.rating] !== undefined) counts[f.rating]++;
        });
        const ORDER = [1, 2, 3, 4, 5];
        return ORDER.map(rating => ({
            name: RATING_LABELS[rating],
            value: counts[rating],
            fill: COLORS[5 - rating]
        })).filter(item => item.value > 0);
    }, [feedbacks]);

    if (!feedbacks || feedbacks.length === 0) return null;

    return (
        <div className="mb-8 flex justify-center">
            <div className="glass-card w-full max-w-lg text-center animate-fade-in-scale" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Subtle gradient background */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg, #818cf8, #c084fc, #f0abfc)',
                    borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                }} />
                <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                        <PieChart>
                            <Pie
                                data={ratingDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={105}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                            >
                                {ratingDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--card-bg-solid)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-md)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                            <Legend
                                payload={
                                    ratingDistribution.map(item => ({
                                        value: item.name,
                                        type: 'circle',
                                        color: item.fill
                                    }))
                                }
                                wrapperStyle={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
