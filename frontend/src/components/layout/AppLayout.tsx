"use client";

import React from "react";
import { Sidebar } from "../navigation/Sidebar";
import { Header } from "../navigation/Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width 72 = 18rem) */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen bg-slate-50">
        <Header />
        <main className="flex-1 p-6 md:p-8 bg-slate-50/70">
          {children}
        </main>
      </div>
    </div>
  );
}
