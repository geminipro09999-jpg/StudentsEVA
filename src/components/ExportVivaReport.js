"use client";

import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ExportVivaReport({ viva, groupedScores }) {
    const handleExport = () => {
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 44, 52);
        doc.text("Viva Evaluation Report", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${timestamp}`, 14, 30);

        // Viva Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Event: ${viva.name}`, 14, 45);
        doc.text(`Date: ${new Date(viva.viva_date).toLocaleDateString()}`, 14, 52);
        
        const criteriaList = viva.criteria.map(c => `${c.name} (${c.max_marks})`).join(", ");
        doc.setFontSize(10);
        doc.text(`Criteria: ${criteriaList}`, 14, 60);

        // Table Data
        const tableColumn = ["Student", "UT Number", "Lecturer", "Scores", "Total", "Remark"];
        const tableRows = [];

        Object.values(groupedScores).forEach(group => {
            const scoresStr = Object.entries(group.criteriaScores)
                .map(([cid, score]) => {
                    const c = viva.criteria.find(crit => crit.id === cid);
                    return `${c?.name}: ${score}`;
                }).join("\n");

            tableRows.push([
                group.student.name,
                group.student.student_id,
                group.lecturer.name,
                scoresStr,
                `${group.total} / ${group.max_total}`,
                group.remark || "-"
            ]);
        });

        doc.autoTable({
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                3: { cellWidth: 40 }, // Scores column
                5: { cellWidth: 40 }  // Remark column
            }
        });

        const fileName = `Viva_Report_${viva.name.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
    };

    return (
        <button onClick={handleExport} className="btn btn-primary flex items-center gap-2">
            <span>📄</span> Export PDF Report
        </button>
    );
}
