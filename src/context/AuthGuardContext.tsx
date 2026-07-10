"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import AuthGuardModal from "@/components/AuthGuardModal";

interface AuthGuardContextType {
    /** Returns true if user is authenticated, false if modal was shown */
    requireAuth: (actionLabel?: string) => boolean;
    isAuthenticated: boolean;
    user: unknown;
}

const AuthGuardContext = createContext<AuthGuardContextType>({
    requireAuth: () => false,
    isAuthenticated: false,
    user: null,
});

export function useAuthGuard() {
    return useContext(AuthGuardContext);
}

export function AuthGuardProvider({ children }: { children: React.ReactNode }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [checked, setChecked] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [actionLabel, setActionLabel] = useState("");

    useEffect(() => {
        getCurrentUser().then((u) => {
            setUser(u);
            setChecked(true);
        });
        const supabase = createClient();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const requireAuth = useCallback(
        (label = "perform this action") => {
            if (user) return true;
            setActionLabel(label);
            setModalOpen(true);
            return false;
        },
        [user]
    );

    const handleClose = useCallback(() => {
        setModalOpen(false);
        // Re-check auth state after modal closes (user may have signed in)
        getCurrentUser().then((u) => setUser(u));
    }, []);

    return (
        <AuthGuardContext.Provider
            value={{
                requireAuth,
                isAuthenticated: !!user,
                user,
            }}
        >
            {children}
            {checked && (
                <AuthGuardModal
                    isOpen={modalOpen}
                    onClose={handleClose}
                    actionLabel={actionLabel}
                />
            )}
        </AuthGuardContext.Provider>
    );
}
