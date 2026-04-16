"use client";

import { useMemo } from "react";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#10b981', '#0ea5e9', '#3b82f6', '#f59e0b', '#ef4444'];
const RATING_LABELS = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Bad" };

export default function DashboardCharts({ feedbacks }) {

    const ratingDistribution = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        feedbacks.forEach(f => {
            if (counts[f.rating] !== undefined) counts[f.rating]++;
        });
        return Object.entries(counts).map(([rating, count]) => ({
            name: Object.keys(RATING_LABELS).includes(rating) ? RATING_LABELS[rating] : rating,
            value: count,
            fill: COLORS[5 - parseInt(rating)]
        })).filter(item => item.value > 0);
    }, [feedbacks]);



    if (!feedbacks || feedbacks.length === 0) return null;

    return (
        <div className="mb-8 flex justify-center">
            <div className="card w-full max-w-lg text-center">
                <h3 className="text-xl font-bold mb-4">Rating Distribution</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={ratingDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {ratingDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
