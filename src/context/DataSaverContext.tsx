"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface DataSaverContextType {
    dataSaver: boolean;
    toggleDataSaver: () => void;
}

const DataSaverContext = createContext<DataSaverContextType>({
    dataSaver: false,
    toggleDataSaver: () => { },
});

export function DataSaverProvider({ children }: { children: ReactNode }) {
    const [dataSaver, setDataSaver] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("wiwokdetok-data-saver");
        if (stored === "true") setDataSaver(true);
    }, []);

    const toggleDataSaver = () => {
        setDataSaver((prev) => {
            const next = !prev;
            localStorage.setItem("wiwokdetok-data-saver", String(next));
            return next;
        });
    };

    return (
        <DataSaverContext.Provider value={{ dataSaver, toggleDataSaver }}>
            {children}
        </DataSaverContext.Provider>
    );
}

export function useDataSaver() {
    return useContext(DataSaverContext);
}
