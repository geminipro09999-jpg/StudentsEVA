import { google } from 'googleapis';

export async function syncFeedbackToGoogleSheet(spreadsheetId, feedbackData) {
    if (!spreadsheetId) return { error: "No Spreadsheet ID provided" };

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Pre-formatted row for appending
        const row = [
            new Date().toLocaleDateString(),
            feedbackData.student_id,
            feedbackData.student_name,
            feedbackData.lab_name || 'N/A',
            feedbackData.category,
            feedbackData.rating_label,
            feedbackData.remark,
            feedbackData.lecturer_name
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:H',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row],
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Google Sheets Sync Error:", error);
        return { error: error.message };
    }
}

export async function syncBulkFeedbackToGoogleSheet(spreadsheetId, feedbacks) {
    if (!spreadsheetId) return { error: "No Spreadsheet ID provided" };
    if (!feedbacks || feedbacks.length === 0) return { success: true, message: "No data to sync" };

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        const ratingLabels = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Average", 1: "Bad" };

        const rows = feedbacks.map(f => [
            new Date(f.created_at).toLocaleDateString(),
            f.students?.student_id || 'N/A',
            f.students?.name || 'N/A',
            f.lab_activities?.name || 'Manual/Other',
            f.category,
            ratingLabels[f.rating] || f.rating,
            f.remark,
            f.users?.name || 'System'
        ]);

        // Overwrite or append? Usually "Sync All" implies a clean state or appending. 
        // User asked for "all my feedback sync button", so I'll append them for now or provide a header.
        // Better: Clear and write if it's a "Full Sync". 
        // But for safety, I'll append with a separator or just append. 
        // Let's just append for now as requested.

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:H',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rows,
            },
        });

        return { success: true, count: rows.length };
    } catch (error) {
        console.error("Bulk Google Sheets Sync Error:", error);
        return { error: error.message };
    }
}

