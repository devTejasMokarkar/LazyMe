import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "LazyMe AI — Apply in 2 Minutes",
  description: "AI-powered job application automation. Build resumes, generate cover letters, and apply with one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
