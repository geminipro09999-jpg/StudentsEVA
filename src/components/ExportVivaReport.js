"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
        const criteriaNames = viva.criteria.map(c => c.name);
        const tableColumn = ["Student", "UT Number", "Lecturer", ...criteriaNames, "Total", "Remark"];
        const tableRows = [];

        Object.values(groupedScores).forEach(group => {
            const row = [
                group.student.name,
                group.student.student_id,
                group.lecturerName
            ];

            // Add individual criteria scores
            viva.criteria.forEach(c => {
                row.push(group.criteriaScores[c.id] || 0);
            });

            row.push(`${group.total} / ${group.max_total}`);
            row.push(group.remark || "-");
            
            tableRows.push(row);
        });

        autoTable(doc, {
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                [tableColumn.length - 1]: { cellWidth: 30 }  // Remark column
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
