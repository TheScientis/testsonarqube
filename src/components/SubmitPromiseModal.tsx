"use client";

import { useState } from "react";
import { submitNewPromise } from "@/app/actions/promises";

export default function SubmitPromiseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [quote, setQuote] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");
    const [politicianName, setPoliticianName] = useState("");
    const [date, setDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await submitNewPromise({ quote, source_url: sourceUrl, politician_name: politicianName, date });
            if (res.success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setQuote("");
                    setSourceUrl("");
                    setPoliticianName("");
                    setDate("");
                }, 2000);
            } else {
                setError(res.error || "Failed to submit promise");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div data-testid="submit-promise-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span>
                        Submit New Promise
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Promise Submitted!</h3>
                            <p className="text-slate-500">Thank you. Our team will review this submission shortly.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {error && (
                                <div className="p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">error</span>
                                    {error}
                                </div>
                            )}

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-bold text-slate-700">Politician Name</span>
                                <input required type="text" value={politicianName} onChange={e => setPoliticianName(e.target.value)} placeholder="Misal: Gubernur Jakarta" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-bold text-slate-700">Date of Promise</span>
                                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-bold text-slate-700">Quote / What was promised?</span>
                                <textarea required value={quote} onChange={e => setQuote(e.target.value)} rows={3} placeholder="Tuliskan kata-kata persis atau ringkasan janji..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none" />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-bold text-slate-700">Source URL</span>
                                <input required type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://news-site.com/article" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                            </label>

                            <div className="pt-2 flex justify-end gap-3 mt-2">
                                <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 flex items-center gap-2">
                                    {loading ? <span className="material-symbols-outlined animate-spin text-sm">auto_renew</span> : <span className="material-symbols-outlined text-sm">send</span>}
                                    Submit Promise
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
