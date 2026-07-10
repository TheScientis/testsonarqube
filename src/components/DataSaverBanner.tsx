"use client";

import { useDataSaver } from "@/context/DataSaverContext";

export default function DataSaverBanner() {
    const { dataSaver } = useDataSaver();

    if (!dataSaver) return null;

    return (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-[1001]">
            <span className="material-symbols-outlined text-[16px]">data_saver_on</span>
            <span>Data Saver Mode Active. High-resolution images and live polling are reduced.</span>
        </div>
    );
}
