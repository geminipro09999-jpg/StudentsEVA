"use client";

import { useMemo } from "react";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3']; // Indigo spectrum
const RATING_LABELS = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Bad" };
const RATING_COLORS = {
    5: '#10b981', // Success Green
    4: '#0ea5e9', // Sky Blue
    3: '#3b82f6', // Blue
    2: '#f59e0b', // Amber
    1: '#ef4444', // Red
};

export default function DashboardCharts({ feedbacks }) {

    const ratingDistribution = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        feedbacks.forEach(f => {
            if (counts[f.rating] !== undefined) counts[f.rating]++;
        });

        // Return in order 5 down to 1
        return [5, 4, 3, 2, 1].map(rating => ({
            name: RATING_LABELS[rating],
            value: counts[rating],
            fill: RATING_COLORS[rating]
        })).filter(item => item.value > 0);
    }, [feedbacks]);

    if (!feedbacks || feedbacks.length === 0) return null;

    return (
        <div className="mb-12 flex justify-center">
            <div className="glass-card w-full max-w-xl text-center animate-fade-in-scale" style={{ border: '1px solid var(--accent-glow)' }}>
                <div className="section-header pt-4">
                    <h2 className="text-xl font-bold bg-gradient-text" style={{ fontSize: '1.4rem' }}>Feedback Analytics</h2>
                    <p className="text-secondary text-xs">Rating distribution across all students</p>
                </div>
                <div className="chart-wrapper" style={{ width: '100%', height: 350, position: 'relative' }}>
                    <ResponsiveContainer width="99%" height="99%" minHeight={350}>
                        <PieChart>
                            <Pie
                                data={ratingDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={75}
                                outerRadius={115}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth={2}
                                animationBegin={0}
                                animationDuration={1200}
                            >
                                {ratingDistribution.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.fill}
                                        style={{ filter: `drop-shadow(0 0 12px ${entry.fill}40)` }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(11, 19, 38, 0.9)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)',
                                    color: 'var(--text-primary)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '10px 15px'
                                }}
                                itemStyle={{ fontWeight: '600' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                iconSize={10}
                                wrapperStyle={{ paddingTop: '20px', fontSize: '0.85rem' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
