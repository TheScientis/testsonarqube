"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuthGuard } from "@/context/AuthGuardContext";
import { useModal } from "@/context/ModalContext";
import {
    listRegulations,
    getRegulation,
    createRegulation,
    updateRegulation,
    softDeleteRegulation,
    restoreRegulation,
} from "@/app/actions/regulations";
import type { Regulation, CreateRegulationInput } from "@/lib/types";
import { getRegions, getRegionLabel } from "@/lib/regions";

const REGION_OPTIONS = [{ value: "", label: "—" }, ...getRegions().map((r) => ({ value: r.id, label: r.label }))];

function formatDate(s: string | null): string {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminRegulationsPage() {
    const { isAuthenticated, requireAuth } = useAuthGuard();
    const { showAlert, showConfirm } = useModal();
    const [authChecked, setAuthChecked] = useState(false);
    const [list, setList] = useState<Regulation[]>([]);
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState<"add" | "edit" | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CreateRegulationInput>({
        title: "",
        type: "uu",
        region_id: null,
        source_url: null,
        content_text: "",
        effective_date: null,
    });

    useEffect(() => {
        if (!requireAuth("manage regulations")) return;
        setAuthChecked(true);
    }, [requireAuth]);

    useEffect(() => {
        if (!authChecked || !isAuthenticated) return;
        setLoading(true);
        listRegulations({ includeDeleted })
            .then(setList)
            .finally(() => setLoading(false));
    }, [authChecked, isAuthenticated, includeDeleted]);

    const openAdd = () => {
        setForm({
            title: "",
            type: "uu",
            region_id: null,
            source_url: null,
            content_text: "",
            effective_date: null,
        });
        setEditingId(null);
        setFormOpen("add");
    };

    const openEdit = async (id: string) => {
        const reg = await getRegulation(id);
        if (!reg) {
            await showAlert("Error", "Regulation not found.");
            return;
        }
        setForm({
            title: reg.title,
            type: reg.type,
            region_id: reg.region_id ?? null,
            source_url: reg.source_url ?? null,
            content_text: reg.content_text,
            effective_date: reg.effective_date ?? null,
        });
        setEditingId(id);
        setFormOpen("edit");
    };

    const closeForm = () => {
        setFormOpen(null);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (formOpen === "add") {
                const result = await createRegulation(form);
                if (result.success) {
                    await showAlert("Saved", "Regulation created and indexed for RAG.");
                    closeForm();
                    setList(await listRegulations({ includeDeleted }));
                } else {
                    await showAlert("Error", result.error ?? "Failed to create.");
                }
            } else if (editingId) {
                const result = await updateRegulation(editingId, form);
                if (result.success) {
                    await showAlert("Saved", "Regulation updated and re-indexed.");
                    closeForm();
                    setList(await listRegulations({ includeDeleted }));
                } else {
                    await showAlert("Error", result.error ?? "Failed to update.");
                }
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        const ok = await showConfirm("Soft delete", `Remove "${title}" from RAG? It will no longer appear in Bang Jaga answers. You can restore it later.`);
        if (!ok) return;
        const result = await softDeleteRegulation(id);
        if (result.success) {
            setList(await listRegulations({ includeDeleted }));
            await showAlert("Removed", "Regulation has been soft-deleted.");
        } else {
            await showAlert("Error", result.error ?? "Failed to delete.");
        }
    };

    const handleRestore = async (id: string) => {
        const result = await restoreRegulation(id);
        if (result.success) {
            setList(await listRegulations({ includeDeleted }));
            await showAlert("Restored", "Regulation is active again.");
        } else {
            await showAlert("Error", result.error ?? "Failed to restore.");
        }
    };

    if (!authChecked || !isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h1 className="text-xl font-bold text-slate-900">Manage Regulations</h1>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={includeDeleted}
                                onChange={(e) => setIncludeDeleted(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            Show deleted
                        </label>
                        <button
                            type="button"
                            onClick={openAdd}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Add regulation
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : list.length === 0 ? (
                    <p className="text-slate-500 py-8">No regulations yet. Add one to power Bang Jaga RAG.</p>
                ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Title</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Region</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Effective</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700">Updated</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((r) => (
                                    <tr
                                        key={r.id}
                                        className={`border-b border-slate-100 last:border-0 ${r.deleted_at ? "bg-slate-50 text-slate-500" : ""}`}
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-900">{r.title}</td>
                                        <td className="px-4 py-3 uppercase text-slate-600">{r.type}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {r.region_id ? getRegionLabel(r.region_id) ?? r.region_id : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{formatDate(r.effective_date)}</td>
                                        <td className="px-4 py-3 text-slate-500">{formatDate(r.updated_at)}</td>
                                        <td className="px-4 py-3 text-right">
                                            {r.deleted_at ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(r.id)}
                                                    className="text-primary hover:underline text-sm font-medium"
                                                >
                                                    Restore
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(r.id)}
                                                        className="text-primary hover:underline text-sm font-medium mr-3"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(r.id, r.title)}
                                                        className="text-red-600 hover:underline text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {formOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">
                                    {formOpen === "add" ? "Add regulation" : "Edit regulation"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                    aria-label="Close"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                        <select
                                            value={form.type}
                                            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "perda" | "uu" }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                                        >
                                            <option value="uu">UU</option>
                                            <option value="pp">PP</option>
                                            <option value="perda">Perda</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                                        <select
                                            value={form.region_id ?? ""}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, region_id: e.target.value || null }))
                                            }
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                                        >
                                            {REGION_OPTIONS.map((opt) => (
                                                <option key={opt.value || "none"} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Source URL</label>
                                    <input
                                        type="url"
                                        value={form.source_url ?? ""}
                                        onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value || null }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Effective date</label>
                                    <input
                                        type="date"
                                        value={form.effective_date ?? ""}
                                        onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value || null }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Content text *</label>
                                    <textarea
                                        value={form.content_text}
                                        onChange={(e) => setForm((f) => ({ ...f, content_text: e.target.value }))}
                                        rows={10}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">This will be chunked and embedded for RAG.</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeForm}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {saving ? "Saving…" : formOpen === "add" ? "Create" : "Update"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
