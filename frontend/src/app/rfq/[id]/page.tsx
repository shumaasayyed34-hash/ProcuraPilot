"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { RFQHeader } from "@/components/rfq/RFQHeader";
import { QuotationSubmissionsList } from "@/components/rfq/QuotationSubmissionsList";
import { UploadQuotationModal } from "@/components/rfq/UploadQuotationModal";
import { ValidationSummaryCards } from "@/components/validation/ValidationSummaryCards";
import { ValidationIssueList } from "@/components/validation/ValidationIssueList";
import { InlineQuickFixModal } from "@/components/validation/InlineQuickFixModal";
import { useToast } from "@/components/ui/Toast";
import { RFQItem, QuotationSubmission, ValidationIssue } from "@/lib/comparison-types";
import { comparisonApi } from "@/lib/comparison-api";

export default function RFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const rfqId = Number(params?.id) || 101;

  const [rfq, setRfq] = useState<RFQItem | null>(null);
  const [quotations, setQuotations] = useState<QuotationSubmission[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedIssueForFix, setSelectedIssueForFix] = useState<ValidationIssue | null>(null);

  useEffect(() => {
    async function loadRFQData() {
      setIsLoading(true);
      try {
        const [rfqData, quotesData, issuesData] = await Promise.all([
          comparisonApi.getRFQById(rfqId),
          comparisonApi.getQuotationsForRFQ(rfqId),
          comparisonApi.getValidationIssues(rfqId),
        ]);
        setRfq(rfqData);
        setQuotations(quotesData);
        setIssues(issuesData);
      } finally {
        setIsLoading(false);
      }
    }
    loadRFQData();
    if (typeof window !== "undefined" && rfqId) {
      localStorage.setItem("procurapilot_active_rfq_id", String(rfqId));
    }
  }, [rfqId]);

  const handleToggleSelectQuote = (quoteId: number) => {
    setQuotations((prev) => {
      const updated = prev.map((q) =>
        q.id === quoteId ? { ...q, is_selected: !q.is_selected } : q
      );
      comparisonApi.saveQuotationsState(rfqId, updated);
      return updated;
    });
  };

  const handleSelectAll = (select: boolean) => {
    setQuotations((prev) => {
      const updated = prev.map((q) =>
        q.validation_status === "rejected" ? q : { ...q, is_selected: select }
      );
      comparisonApi.saveQuotationsState(rfqId, updated);
      return updated;
    });
  };

  const handleRerunValidation = async () => {
    setIsValidating(true);
    try {
      await comparisonApi.rerunValidation(rfqId);
      const [freshQuotes, freshIssues] = await Promise.all([
        comparisonApi.getQuotationsForRFQ(rfqId),
        comparisonApi.getValidationIssues(rfqId),
      ]);
      setQuotations(freshQuotes);
      setIssues(freshIssues);
      toast.success(
        "Validation Pipeline Executed",
        "All quotations re-validated against S2.4 data hygiene and FX conversion rules."
      );
    } catch (e) {
      toast.error("Validation Failed", "Could not complete validation pass.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleResolveIssue = async (
    issueId: string,
    resolution: {
      type: "rectified" | "overridden" | "rejected";
      rectifiedValue?: string | number;
      note?: string;
    }
  ) => {
    try {
      const result = await comparisonApi.resolveValidationIssue(rfqId, issueId, resolution);
      if (result.success) {
        // Refresh local issues & quotes
        const [freshIssues, freshQuotes] = await Promise.all([
          comparisonApi.getValidationIssues(rfqId),
          comparisonApi.getQuotationsForRFQ(rfqId),
        ]);
        setIssues(freshIssues);
        setQuotations(freshQuotes);

        if (resolution.type === "rectified") {
          toast.success("Field Rectified Inline", `Field updated to "${resolution.rectifiedValue}".`);
        } else if (resolution.type === "overridden") {
          toast.info("Warning Acknowledged", "Marked as verified by procurement officer.");
        } else {
          toast.warning("Quotation Excluded", "Quotation removed from active comparison.");
        }
      }
    } catch (e) {
      toast.error("Action Failed", "Could not save resolution.");
    }
  };

  const handleAcknowledgeWarning = (issueId: string) => {
    handleResolveIssue(issueId, {
      type: "overridden",
      note: "Acknowledged and verified by Procurement Lead",
    });
  };

  const handleCompareClick = () => {
    const selected = quotations.filter((q) => q.is_selected);
    if (selected.length < 2) {
      toast.warning("Select At Least 2 Suppliers", "At least two valid quotations are required for multi-criteria comparison.");
      return;
    }
    setIsComparing(true);
    router.push(`/comparison/${rfqId}`);
  };

  if (isLoading || !rfq) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
        </div>
      </AppLayout>
    );
  }

  const selectedCount = quotations.filter((q) => q.is_selected).length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* RFQ Header Component */}
        <RFQHeader
          rfq={rfq}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onRerunValidation={handleRerunValidation}
          onCompareClick={handleCompareClick}
          isValidating={isValidating}
          isComparing={isComparing}
          selectedQuotesCount={selectedCount}
        />

        {/* Incoming Supplier Quotations List Component */}
        <QuotationSubmissionsList
          quotations={quotations}
          onToggleSelect={handleToggleSelectQuote}
          onSelectAll={handleSelectAll}
          onViewValidation={(quoteId) => {
            const targetIssue = (issues || []).find((i) => i.quotation_id === quoteId);
            if (targetIssue) setSelectedIssueForFix(targetIssue);
          }}
        />

        {/* Validation Summary Cards Component */}
        <div className="pt-2">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Automated Data Hygiene & Validation Report (S2.4)
            </h2>
            <p className="text-xs text-slate-500">
              Real-time audit verifying mandatory fields, tax rate compliance, and deduplication.
            </p>
          </div>
          <ValidationSummaryCards issues={issues} totalFieldsValidated={104} />
        </div>

        {/* Granular Validation Issue List Component with Quick-Fix actions */}
        <ValidationIssueList
          issues={issues}
          onQuickFixClick={(issue) => setSelectedIssueForFix(issue)}
          onAcknowledgeWarning={handleAcknowledgeWarning}
        />

        {/* Modals */}
        <UploadQuotationModal
          rfqId={rfqId}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={(filename) => {
            toast.success("Quotation Uploaded", `File "${filename}" submitted for OCR extraction and validation.`);
          }}
        />

        <InlineQuickFixModal
          issue={selectedIssueForFix}
          isOpen={!!selectedIssueForFix}
          onClose={() => setSelectedIssueForFix(null)}
          onResolve={handleResolveIssue}
        />
      </div>
    </AppLayout>
  );
}
