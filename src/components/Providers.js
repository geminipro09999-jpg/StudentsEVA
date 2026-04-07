"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export const AuthProvider = ({ children }) => {
    return (
        <SessionProvider>
            <ThemeProvider attribute="data-theme" defaultTheme="dark">
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
};
