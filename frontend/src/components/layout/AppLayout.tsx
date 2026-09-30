"use client";

import React from "react";
import { Sidebar } from "../navigation/Sidebar";
import { Header } from "../navigation/Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width 72 = 18rem) */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]">
          {children}
        </main>
      </div>
    </div>
  );
}
