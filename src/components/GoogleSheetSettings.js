"use client";

import { useState } from "react";
import { updateSetting } from "@/app/actions/settingsActions";
import { syncAllFeedback } from "@/app/actions/feedbackActions";

export default function GoogleSheetSettings({ initialSheetId }) {
    const [sheetId, setSheetId] = useState(initialSheetId || "");
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState("");

    const handleSave = async () => {
        setLoading(true);
        setMessage("");
        try {
            const res = await updateSetting('google_sheet_id', sheetId);
            if (res.error) {
                setMessage("❌ " + res.error);
            } else {
                setMessage("✅ Connected successfully!");
            }
        } catch (e) {
            setMessage("❌ Error saving.");
        }
        setLoading(false);
    };

    const handleSyncAll = async () => {
        if (!confirm("This will sync ALL feedback entries to the connected Google Sheet. Continue?")) return;
        setSyncing(true);
        setMessage("");
        try {
            const res = await syncAllFeedback();
            if (res.error) {
                setMessage("❌ Sync failed: " + res.error);
            } else {
                setMessage(`✅ Successfully synced ${res.count} entries!`);
            }
        } catch (e) {
            setMessage("❌ Sync failed.");
        }
        setSyncing(false);
    };

    return (
        <div className="mt-4 p-4 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
            <div className="d-flex items-center gap-1 mb-2">
                <span style={{ fontSize: '1.2rem' }}>🔗</span>
                <h4 style={{ margin: 0 }}>Google Sheets Sync</h4>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Spreadsheet ID (from URL)
            </p>

            <div className="d-flex gap-1">
                <input
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="1ZXnRrI6nnsFqM..."
                    style={{ flex: 1 }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? "..." : "Connect"}
                </button>
            </div>

            <div className="mt-3 d-flex justify-between items-center">
                <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid var(--success)' }}
                    onClick={handleSyncAll}
                    disabled={syncing || !sheetId}
                >
                    {syncing ? "⌛ Syncing..." : "🔄 Sync All Feedback"}
                </button>
                {message && <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{message}</span>}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <span>💡</span>
                <span>Ensure the sheet has a tab named 'Sheet1' and the service account has 'Editor' access.</span>
            </p>
        </div>
    );
}
