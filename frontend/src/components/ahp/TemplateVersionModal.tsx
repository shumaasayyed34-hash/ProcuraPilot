"use client";

import React, { useState } from "react";
import {
  AHPWeightTemplate,
  AHPTemplateVersion,
  AHPCriteriaWeights,
} from "@/lib/ahp-types";
import {
  X,
  History,
  GitCommit,
  CheckCircle2,
  Calendar,
  User,
  RotateCcw,
  Plus,
  Save,
} from "lucide-react";

interface TemplateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AHPWeightTemplate;
  onRestoreVersion: (version: AHPTemplateVersion) => void;
  onSaveNewVersion: (newVersion: AHPTemplateVersion) => void;
  currentWeights: AHPCriteriaWeights;
}

export function TemplateVersionModal({
  isOpen,
  onClose,
  template,
  onRestoreVersion,
  onSaveNewVersion,
  currentWeights,
}: TemplateVersionModalProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [versionTag, setVersionTag] = useState("v2.2-custom");
  const [authorName, setAuthorName] = useState("Faisal Sakware");
  const [changeNotes, setChangeNotes] = useState("");

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTag || !changeNotes) return;

    const newVer: AHPTemplateVersion = {
      version: versionTag,
      author: authorName || "Faisal Sakware",
      approved_at: new Date().toISOString(),
      notes: changeNotes,
      weights: { ...currentWeights },
    };

    onSaveNewVersion(newVer);
    setIsCreatingNew(false);
    setChangeNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Template Version Control & Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                {template.name} ({template.currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Action Toggle */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">
              Revision Log ({template.versionHistory.length} approved versions)
            </div>
            {!isCreatingNew && (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Current Weights as New Version</span>
              </button>
            )}
          </div>

          {/* New Version Form */}
          {isCreatingNew && (
            <form
              onSubmit={handleSave}
              className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">
                  Save New Version Snapshot
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    required
                    placeholder="e.g. v2.2-custom"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Author / Committer
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Change Rationale / Policy Justification
                </label>
                <textarea
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  rows={2}
                  required
                  placeholder="Describe why these weights are adjusted (e.g., Q4 cost savings push, supplier lead time buffer)..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-500 font-mono">
                  Weights: Cost {Math.round(currentWeights.price * 100)}% • Quality {Math.round(currentWeights.quality * 100)}% • Lead Time {Math.round(currentWeights.delivery * 100)}% • ESG {Math.round(currentWeights.esg * 100)}%
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Commit Version</span>
                </button>
              </div>
            </form>
          )}

          {/* Timeline of Versions */}
          <div className="space-y-3">
            {template.versionHistory.map((ver, idx) => {
              const isCurrent = ver.version === template.currentVersion;
              return (
                <div
                  key={ver.version}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-blue-50/40 border-blue-300 ring-1 ring-blue-500/20 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {ver.version}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active Applied Version</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{ver.author}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(ver.approved_at).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 pt-1">
                        {ver.notes}
                      </p>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreVersion(ver);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>

                  {/* Weights Pill Breakdown */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                      Cost: {Math.round(ver.weights.price * 100)}%
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                      Quality: {Math.round(ver.weights.quality * 100)}%
                    </span>
                    <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-semibold">
                      Lead Time: {Math.round(ver.weights.delivery * 100)}%
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                      ESG: {Math.round(ver.weights.esg * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
