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

    <div className="mt-8 p-6 glass-card border-accent/20 bg-accent/5">
        <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🔗</span>
            <h4 className="text-xl font-bold text-accent">Google Sheets Sync</h4>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Spreadsheet ID</label>
                <div className="flex gap-3">
                    <input
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        placeholder="e.g. 1ZXnRrI6nnsFqM..."
                        className="flex-1"
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? "..." : "Connect"}
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                <button
                    className="btn btn-secondary text-sm border-success text-success bg-success/10 hover:bg-success/20 w-full sm:w-auto"
                    onClick={handleSyncAll}
                    disabled={syncing || !sheetId}
                >
                    {syncing ? "⌛ Syncing..." : "🔄 Sync All Feedback"}
                </button>
                {message && <span className="text-sm font-bold animate-fade-in">{message}</span>}
            </div>

            <div className="flex gap-3 p-3 bg-black/20 rounded-lg text-xs leading-relaxed text-secondary border border-white/5">
                <span>💡</span>
                <span>Ensure the sheet has a tab named 'Sheet1' and the service account has 'Editor' access.</span>
            </div>
        </div>
    </div>
}
