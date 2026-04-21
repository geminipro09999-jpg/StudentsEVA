// Run: node generate_sample_attendance.js
const XLSX = require('xlsx');

const data = [
    { ut_number: 'S1001', month: 4, year: 2026, present_days: 20, total_days: 22 },
    { ut_number: 'S1002', month: 4, year: 2026, present_days: 15, total_days: 22 },
    { ut_number: 'S1003', month: 4, year: 2026, present_days: 22, total_days: 22 },
    { ut_number: 'S1004', month: 4, year: 2026, present_days: 10, total_days: 22 },
    { ut_number: 'S1005', month: 4, year: 2026, present_days: 18, total_days: 22 },
];

const ws = XLSX.utils.json_to_sheet(data);

// Set column widths
ws['!cols'] = [
    { wch: 14 }, // ut_number
    { wch: 8 },  // month
    { wch: 8 },  // year
    { wch: 14 }, // present_days
    { wch: 12 }, // total_days
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

XLSX.writeFile(wb, 'sample_attendance.xlsx');
console.log('✅ sample_attendance.xlsx created successfully!');
console.log('Required columns: ut_number, month (1-12), year, present_days, total_days');
