"use client";

import { deleteViva } from "@/app/actions/vivaActions";
import { useState } from "react";
import toast from "react-hot-toast";

export default function DeleteVivaButton({ vivaId }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this Viva? All associated scores and data will be permanently removed.")) {
            return;
        }

        setLoading(true);
        const res = await deleteViva(vivaId);
        if (res.success) {
            toast.success("Viva event deleted successfully");
            // No need to reload, revalidatePath in action handles it
        } else {
            toast.error(res.error || "Failed to delete Viva");
        }
        setLoading(false);
    };

    return (
        <button 
            onClick={handleDelete}
            disabled={loading}
            className="btn btn-secondary border-danger text-danger hover:bg-danger/10 py-3 px-4"
            title="Delete Viva"
        >
            {loading ? "..." : "🗑️"}
        </button>
    );
}
