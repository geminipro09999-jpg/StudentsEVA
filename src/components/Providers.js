"use client";

import { SessionProvider } from "next-auth/react";
import { CustomThemeProvider } from "./CustomThemeProvider";

export const AuthProvider = ({ children }) => {
    return (
        <SessionProvider>
            <CustomThemeProvider>
                {children}
            </CustomThemeProvider>
        </SessionProvider>
    );
};
