"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ExportVivaReport({ viva, groupedScores }) {
    const handleExportPDF = () => {
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

        const panelistsList = viva.panelists.map(p => `${p.users.name} (${p.weight}%)`).join(", ");
        doc.text(`Panel: ${panelistsList}`, 14, 67);

        // Table Data
        const criteriaNames = viva.criteria.map(c => c.name);
        const tableColumn = ["Student", "UT Number", "Panelists", ...criteriaNames, "Weighted Total", "Remark"];
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
            startY: 75,
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

    const handleExportExcel = () => {
        const timestamp = new Date().toLocaleString();
        const criteriaNames = viva.criteria.map(c => c.name);
        
        // Metadata Rows
        const data = [
            ["Viva Evaluation Report"],
            [`Generated on: ${timestamp}`],
            [],
            [`Event: ${viva.name}`],
            [`Date: ${new Date(viva.viva_date).toLocaleDateString()}`],
            [`Criteria: ${viva.criteria.map(c => `${c.name} (${c.max_marks})`).join(", ")}`],
            [`Panel: ${viva.panelists.map(p => `${p.users.name} (${p.weight}%)`).join(", ")}`],
            [],
            ["Student", "UT Number", "Panelists", ...criteriaNames, "Weighted Total", "Remark"]
        ];

        // Table Data
        Object.values(groupedScores).forEach(group => {
            const row = [
                group.student.name,
                group.student.student_id,
                group.lecturerName
            ];

            viva.criteria.forEach(c => {
                row.push(group.criteriaScores[c.id] || 0);
            });

            row.push(`${group.total} / ${group.max_total}`);
            row.push(group.remark || "-");
            
            data.push(row);
        });

        // Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Add some basic styling (column widths)
        ws['!cols'] = [
            { wch: 25 }, // Student
            { wch: 15 }, // UT Number
            { wch: 20 }, // Panelists
            ...criteriaNames.map(() => ({ wch: 15 })), // Criteria
            { wch: 15 }, // Weighted Total
            { wch: 30 }  // Remark
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Viva Report");

        // Save File
        const fileName = `Viva_Report_${viva.name.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="flex gap-2">
            <button onClick={handleExportPDF} className="btn btn-secondary flex items-center gap-2">
                <span>📄</span> Export PDF
            </button>
            <button onClick={handleExportExcel} className="btn btn-primary flex items-center gap-2">
                <span>📊</span> Export Excel
            </button>
        </div>
    );
}
