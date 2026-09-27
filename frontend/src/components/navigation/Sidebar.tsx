"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileUp,
  LayoutDashboard,
  GitCompare,
  Sliders,
  ShieldAlert,
  Sparkles,
  MessageSquareCode,
  Layers,
  Link2,
  Leaf,
  ChevronRight,
  Bot,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: string;
  isReady: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Executive Dashboard",
    href: "/",
    icon: LayoutDashboard,
    phase: "Phase 1",
    isReady: true,
  },
  {
    title: "Document Ingestion",
    href: "/upload",
    icon: FileUp,
    phase: "Phase 1",
    isReady: true,
  },
  {
    title: "Supplier Comparison",
    href: "/suppliers",
    icon: GitCompare,
    phase: "Phase 2",
    isReady: false,
  },
  {
    title: "AHP Scoring Engine",
    href: "/ahp",
    icon: Sliders,
    phase: "Phase 3",
    isReady: false,
  },
  {
    title: "Risk Intelligence",
    href: "/risk",
    icon: ShieldAlert,
    phase: "Phase 4",
    isReady: false,
  },
  {
    title: "AI Recommendations",
    href: "/recommendations",
    icon: Sparkles,
    phase: "Phase 5",
    isReady: false,
  },
  {
    title: "Negotiation AI",
    href: "/negotiation",
    icon: MessageSquareCode,
    phase: "Phase 6",
    isReady: false,
  },
  {
    title: "ERP Integration",
    href: "/erp",
    icon: Layers,
    phase: "Phase 7",
    isReady: false,
  },
  {
    title: "Blockchain Audit Trail",
    href: "/audit",
    icon: Link2,
    phase: "Phase 8",
    isReady: false,
  },
  {
    title: "Carbon / ESG Tracking",
    href: "/carbon",
    icon: Leaf,
    phase: "Phase 9",
    isReady: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-72 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col text-slate-100 transition-all">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-800/70">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              ProcuraPilot
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Enterprise Quotation Hub</p>
        </div>
      </div>

      {/* Phase Banner */}
      <div className="mx-4 my-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-indigo-300">Active Phase</p>
          <p className="text-xs font-bold text-white">Phase 1 • Ingestion</p>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform Pipeline
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.isReady ? item.href : "#"}
              className={cn(
                "group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                  : item.isReady
                  ? "text-slate-300 hover:text-white hover:bg-slate-900/80"
                  : "text-slate-500 hover:text-slate-400 hover:bg-slate-900/30 cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-white"
                      : item.isReady
                      ? "text-slate-400 group-hover:text-indigo-400"
                      : "text-slate-600"
                  )}
                />
                <span>{item.title}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono",
                    isActive
                      ? "bg-indigo-700/60 text-indigo-100"
                      : item.isReady
                      ? "bg-slate-800 text-slate-400"
                      : "bg-slate-900 text-slate-600"
                  )}
                >
                  {item.phase}
                </span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Faisal Role Footer */}
      <div className="p-4 border-t border-slate-800/70 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-sm">
            FS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Faisal Sakware</p>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400 inline" /> Lead UI & Deploy
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
