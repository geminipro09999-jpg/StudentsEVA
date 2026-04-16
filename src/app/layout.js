import "./globals.css";
import { AuthProvider } from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Student Evaluation System",
  description: "A premium role-based evaluation dashboard for educational institutions.",
};

import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          {children}
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--card-border)',
            }
          }} />
        </AuthProvider>
      </body>
    </html>
  );
}
