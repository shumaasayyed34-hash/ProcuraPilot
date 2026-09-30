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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-8">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search RFQs, quotations, suppliers..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Backend Status indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>FastAPI Engine Ready</span>
        </div>

        {/* Quick Upload Button */}
        <Link
          href="/upload"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Quotation</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-semibold text-slate-200">
                <span>System Notifications</span>
                <span className="text-[10px] text-indigo-400 font-normal">Phase 1</span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <p className="font-medium text-slate-200">OCR Engine Online</p>
                  <p className="text-[11px] text-slate-400">
                    Tesseract and PaddleOCR pipelines calibrated for quotation parsing.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <p className="font-medium text-slate-200">PostgreSQL Schema Ready</p>
                  <p className="text-[11px] text-slate-400">
                    16 tables initialized for quotes, suppliers, and audit logs.
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
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 font-semibold text-xs flex items-center justify-center">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-none">
                  {user?.full_name || user?.email}
                </p>
                <span className="text-[10px] font-mono text-indigo-400 capitalize">
                  {user?.role || "Buyer"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs">
                <div className="p-2 border-b border-slate-800">
                  <p className="font-medium text-slate-200 truncate">{user?.full_name || "User"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px]">
                    <Shield className="w-2.5 h-2.5" />
                    <span className="capitalize">{user?.role} Access</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
