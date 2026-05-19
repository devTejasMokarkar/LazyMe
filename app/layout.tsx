import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "LazyMe AI — Apply in 2 Minutes",
  description: "AI-powered job application automation. Build resumes, generate cover letters, and apply with one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}