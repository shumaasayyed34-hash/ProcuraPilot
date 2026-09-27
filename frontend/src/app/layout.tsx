import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProcuraPilot AI — Enterprise Procurement Intelligence",
  description: "AI-Powered Quotation Analysis, AHP Multi-Criteria Supplier Scoring, and Procurement Automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className={`${inter.className} min-h-full bg-slate-950 text-slate-100 flex flex-col`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
