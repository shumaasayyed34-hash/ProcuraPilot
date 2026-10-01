"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileUp,
  LayoutDashboard,
  GitCompare,
  FolderGit2,
  Sliders,
  ShieldAlert,
  Sparkles,
  MessageSquareCode,
  Layers,
  Link2,
  Leaf,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: string;
  isReady: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: "Executive Dashboard",
    href: "/",
    icon: LayoutDashboard,
    phase: "Overview",
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
    title: "RFQ Workspaces",
    href: "/rfq",
    icon: FolderGit2,
    phase: "Phase 2",
    isReady: true,
    badge: "Active",
  },
  {
    title: "Supplier Comparison",
    href: "/comparison",
    icon: GitCompare,
    phase: "Phase 2",
    isReady: true,
    badge: "Matrix",
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
    title: "Audit & Traceability",
    href: "/audit",
    icon: Link2,
    phase: "Phase 8",
    isReady: false,
  },
  {
    title: "ESG & Sustainability",
    href: "/carbon",
    icon: Leaf,
    phase: "Phase 9",
    isReady: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col text-slate-800 transition-all shadow-sm">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200 bg-white">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm text-white">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900">
              ProcuraPilot
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              AI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">B2B Procurement Platform</p>
        </div>
      </div>

      {/* Active Phase Pill */}
      <div className="mx-4 my-3 p-3 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Active Workspace</p>
          <p className="text-xs font-bold text-slate-900">Phase 2 • Validation & Compare</p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
          Live
        </span>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-3 pb-1 pt-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Decision Pipeline
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.isReady ? item.href : "#"}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600"
                  : item.isReady
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  : "text-slate-400 hover:text-slate-500 hover:bg-slate-50/50 cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors shrink-0",
                    isActive
                      ? "text-blue-600"
                      : item.isReady
                      ? "text-slate-500 group-hover:text-blue-600"
                      : "text-slate-400"
                  )}
                />
                <span className="truncate">{item.title}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-700">
                    {item.badge}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono",
                    isActive
                      ? "bg-blue-100/70 text-blue-700"
                      : item.isReady
                      ? "bg-slate-100 text-slate-500"
                      : "bg-slate-100/60 text-slate-400"
                  )}
                >
                  {item.phase}
                </span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Faisal Role Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
            FS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Faisal Sakware</p>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 inline shrink-0" />
              <span>Validation & Comparison Lead</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
