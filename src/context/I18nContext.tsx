"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import id from "@/locales/id.json";
import en from "@/locales/en.json";

type Locale = "id" | "en";
type Dictionary = typeof id;

interface I18nContextType {
    locale: Locale;
    setLocale: (l: Locale) => void;
    t: (key: string) => string;
}

const dictionaries: Record<Locale, Dictionary> = { id, en };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("en");

    useEffect(() => {
        const saved = localStorage.getItem("locale") as Locale;
        if (saved && (saved === "id" || saved === "en")) {
            setLocaleState(saved);
        }
    }, []);

    const setLocale = (l: Locale) => {
        setLocaleState(l);
        localStorage.setItem("locale", l);
        // Optionally update user_preferences in Supabase here if logged in
    };

    const t = (key: string): string => {
        const keys = key.split(".");
        let value: any = dictionaries[locale];

        for (const k of keys) {
            if (value && typeof value === "object" && k in value) {
                value = value[k];
            } else {
                // Fallback to English if translation is missing in ID
                let fallbackValue: any = dictionaries.en;
                for (const fbK of keys) {
                    if (fallbackValue && typeof fallbackValue === "object" && fbK in fallbackValue) {
                        fallbackValue = fallbackValue[fbK];
                    } else {
                        return key; // return key if not found in either
                    }
                }
                return typeof fallbackValue === "string" ? fallbackValue : key;
            }
        }

        return typeof value === "string" ? value : key;
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslations() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error("useTranslations must be used within an I18nProvider");
    }
    return context;
}
