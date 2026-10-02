"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";

interface AuthCardProps {
  initialTab?: "login" | "register";
}

export function AuthCard({ initialTab = "login" }: AuthCardProps) {
  const router = useRouter();
  const { user, login, register, logout, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);

  // Sign In Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form State
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [role, setRole] = useState<UserRole>("buyer");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("procurapilot_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRegEmail(savedEmail);
      }
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("procurapilot_remembered_email", email);
        } else {
          localStorage.removeItem("procurapilot_remembered_email");
        }
      }
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("procurapilot_remembered_email", regEmail);
      }
      await register(regEmail, regPassword, fullName, role);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to register account");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleChoice: "buyer" | "manager") => {
    if (roleChoice === "buyer") {
      setEmail("buyer@procurapilot.ai");
      setPassword("Procura@2026");
    } else {
      setEmail("manager@procurapilot.ai");
      setPassword("Procura@2026");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 items-center justify-center shadow-sm text-white mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome to ProcuraPilot AI
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise B2B Procurement Decision Platform
          </p>
        </div>

        {/* Existing Active Session Banner (if already logged in) */}
        {!isLoading && isAuthenticated && user && (
          <div className="mb-5 p-4 rounded-2xl bg-blue-50/90 border border-blue-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.email.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Active Session: <span className="text-blue-700">{user.email}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    Role: {user.role || "procurement_manager"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch / Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Auth Card Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
          {/* Segmented Tab Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab("login"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("register"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {activeTab === "login" ? "Sign in to your workspace" : "Register company profile"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {activeTab === "login" ? "JWT Authenticated Session" : "Create new procurement credentials"}
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              Live
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN TAB */}
          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="authEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="authEmail"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@procurapilot.ai"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="authPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="authPassword"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Remember email & credentials</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? "Authenticating..." : "Sign In to Decision Hub"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Demo Fill Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 mb-2">
                  Quick Demo Credentials (1-Click Fill):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill("buyer")}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors text-left cursor-pointer"
                  >
                    <span className="font-bold block text-slate-900">Procurement Buyer</span>
                    <span className="text-[10px] text-slate-500">buyer@procurapilot.ai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("manager")}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors text-left cursor-pointer"
                  >
                    <span className="font-bold block text-slate-900">Procurement Manager</span>
                    <span className="text-[10px] text-slate-500">manager@procurapilot.ai</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* REGISTER TAB */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label htmlFor="regFullName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="regFullName"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Faisal Sakware"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="regEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="faisal@procurapilot.ai"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="regPassword"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Organizational Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`py-2 px-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      role === "buyer"
                        ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">Procurement Buyer</span>
                    <span className="text-[10px] text-slate-500 font-normal">Sourcing & quotes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("manager")}
                    className={`py-2 px-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      role === "manager"
                        ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block font-bold">Procurement Manager</span>
                    <span className="text-[10px] text-slate-500 font-normal">Approval & AHP lead</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? "Registering..." : "Create Account & Enter Platform"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              {activeTab === "login" ? (
                <>
                  Need a new account?{" "}
                  <button
                    type="button"
                    onClick={() => { setActiveTab("register"); setError(null); }}
                    className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                  >
                    Register company profile
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => { setActiveTab("login"); setError(null); }}
                    className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                  >
                    Sign in to existing account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
