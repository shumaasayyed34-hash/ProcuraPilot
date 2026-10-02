"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  UploadCloud,
  LogOut,
  ChevronDown,
  Shield,
  CheckCircle2,
  PlusCircle,
  FileCheck2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/rfq?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shadow-xs">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search RFQs, vendor quotations, line items..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Backend & Validation Status indicator */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Validation Engine Active</span>
        </div>

        {/* Quick Compare / RFQ link */}
        <Link
          href="/rfq"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Active RFQs</span>
        </Link>

        {/* Quick Upload Button */}
        <Link
          href="/upload"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Ingest Quote</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl p-3.5 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-900">
                <span>Procurement Notifications</span>
                <span className="text-[10px] text-blue-600 font-medium">Phase 2 Real-Time</span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">Validation Engine S2.4</p>
                    <span className="text-[10px] text-slate-400">2m ago</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Quotation #QT-2025-0841 validated with 1 non-blocking warning (Missing Incoterms).
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">Comparison Matrix Ready</p>
                    <span className="text-[10px] text-slate-400">10m ago</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    3 vendor quotes for RFQ-2025-0841 normalized to INR baseline.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "F"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">
                  {user?.full_name || "Faisal Sakware"}
                </p>
                <p className="text-[10px] text-slate-500 capitalize leading-none mt-0.5">
                  {user?.role || "Procurement Lead"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">{user?.full_name || "Faisal Sakware"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || "faisal@procurapilot.ai"}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/rfq"
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>My RFQs</span>
                  </Link>
                  <Link
                    href="/comparison"
                    className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Comparison Matrices</span>
                  </Link>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-xs"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
