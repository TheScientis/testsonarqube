"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import Modal, { ModalType } from "@/components/Modal";

interface ModalState {
    isOpen: boolean;
    type: ModalType;
    title: string;
    description?: string;
    inputPlaceholder?: string;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    showAlert: (title: string, description?: string) => Promise<void>;
    showConfirm: (title: string, description?: string) => Promise<boolean>;
    showPrompt: (title: string, description?: string, placeholder?: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ModalState>({
        isOpen: false,
        type: "alert",
        title: "",
    });

    const [resolveFn, setResolveFn] = useState<(value: unknown) => void>();

    const close = useCallback(() => {
        setState((s) => ({ ...s, isOpen: false }));
        // Let the animation finish before unmounting the text (optional visual tweak)
    }, []);

    const showModal = useCallback((
        type: ModalType,
        title: string,
        description?: string,
        inputPlaceholder?: string
    ) => {
        setState({
            isOpen: true,
            type,
            title,
            description,
            inputPlaceholder,
            confirmText: type === "confirm" ? "Confirm" : "OK",
            cancelText: "Cancel"
        });

        return new Promise<unknown>((resolve) => {
            setResolveFn(() => resolve);
        });
    }, []);

    const showAlert = useCallback(async (title: string, description?: string) => {
        await showModal("alert", title, description);
    }, [showModal]);

    const showConfirm = useCallback(async (title: string, description?: string) => {
        const result = await showModal("confirm", title, description);
        return result === true; // Returns true if OK clicked, false if Cancel
    }, [showModal]);

    const showPrompt = useCallback(async (title: string, description?: string, placeholder?: string) => {
        const result = await showModal("prompt", title, description, placeholder);
        return result as string | null; // Returns string if OK, null if Cancel
    }, [showModal]);

    const handleConfirm = useCallback((value?: string) => {
        close();
        if (resolveFn) {
            if (state.type === "alert" || state.type === "confirm") {
                resolveFn(true); // User accepted
            } else if (state.type === "prompt") {
                resolveFn(value || ""); // Return prompt string value
            }
        }
    }, [close, resolveFn, state.type]);

    const handleCancel = useCallback(() => {
        close();
        if (resolveFn) {
            if (state.type === "confirm") {
                resolveFn(false); // User declined
            } else if (state.type === "prompt") {
                resolveFn(null); // User cancelled prompt
            }
        }
    }, [close, resolveFn, state.type]);

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}
            <Modal
                {...state}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
}
