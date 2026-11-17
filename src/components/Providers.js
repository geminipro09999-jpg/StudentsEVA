"use client";

import { SessionProvider } from "next-auth/react";
import { CustomThemeProvider } from "./CustomThemeProvider";
import { Toaster } from "react-hot-toast";

export const AuthProvider = ({ children }) => {
    return (
        <SessionProvider>
            <CustomThemeProvider>
                {children}
                <Toaster position="bottom-right" toastOptions={{
                    style: {
                        background: 'var(--bg-color)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--card-border)',
                    }
                }} />
            </CustomThemeProvider>
        </SessionProvider>
    );
};
