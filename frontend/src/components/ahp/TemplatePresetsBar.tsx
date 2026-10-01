"use client";

import React, { useState } from "react";
import {
  AHPWeightTemplate,
  AHPTemplateVersion,
  AHPCriteriaWeights,
} from "@/lib/ahp-types";
import {
  Bookmark,
  History,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { TemplateVersionModal } from "./TemplateVersionModal";

interface TemplatePresetsBarProps {
  templates: AHPWeightTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: AHPWeightTemplate) => void;
  onSaveNewVersion: (templateId: string, newVersion: AHPTemplateVersion) => void;
  currentWeights: AHPCriteriaWeights;
}

export function TemplatePresetsBar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveNewVersion,
  currentWeights,
}: TemplatePresetsBarProps) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Evaluation Criteria Presets
                </span>
                <span className="text-[11px] text-slate-500">
                  Pre-configured MCDM weight profiles
                </span>
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  const target = templates.find((t) => t.id === e.target.value);
                  if (target) onSelectTemplate(target);
                }}
                className="w-full sm:w-64 appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-800 hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white shadow-2xs cursor-pointer"
              >
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.currentVersion})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Active Template Meta & Version Control Trigger */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <div className="hidden lg:block text-right">
              <span className="text-[11px] text-slate-600 font-medium block">
                {activeTemplate?.tagline}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Version Tag: {activeTemplate?.currentVersion}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Version History ({activeTemplate?.versionHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Version Modal */}
      {activeTemplate && (
        <TemplateVersionModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          template={activeTemplate}
          onRestoreVersion={(ver) => {
            onSelectTemplate({
              ...activeTemplate,
              weights: ver.weights,
              currentVersion: ver.version,
            });
          }}
          onSaveNewVersion={(newVer) => {
            onSaveNewVersion(activeTemplate.id, newVer);
          }}
          currentWeights={currentWeights}
        />
      )}
    </>
  );
}
