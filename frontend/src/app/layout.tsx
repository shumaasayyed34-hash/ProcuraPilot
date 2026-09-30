import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProcuraPilot AI — Enterprise Procurement Decision Platform",
  description: "B2B AI-Powered Quotation Validation, Multi-Vendor Comparison Engine, and Procurement Optimization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased bg-slate-50 text-slate-900">
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-900 flex flex-col`}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
