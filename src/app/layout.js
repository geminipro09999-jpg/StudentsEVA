import "./globals.css";
import { AuthProvider } from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Student Evaluation System",
  description: "A premium role-based evaluation dashboard for educational institutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
