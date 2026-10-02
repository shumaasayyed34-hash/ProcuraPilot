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

        {/* Section: RFQ Line Items & Invited Suppliers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Line Items Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Technical Specifications & Line Items
                </h3>
                <p className="text-[11px] text-slate-400">
                  {(rfq as any).items?.length || rfq.line_items?.length || 1} required items in this sourcing package
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Quantity</th>
                    <th className="pb-2 text-right">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((rfq as any).items && (rfq as any).items.length > 0
                    ? (rfq as any).items
                    : rfq.line_items || []
                  ).map((itm: any, idx: number) => (
                    <tr key={itm.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 font-mono font-bold text-blue-700 text-xs">
                        {itm.product_code || itm.item_code || `ITM-0${idx + 1}`}
                      </td>
                      <td className="py-2.5 text-slate-800 font-medium max-w-xs">{itm.description}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        {Number(itm.quantity || 1).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-500 text-[11px]">
                        {itm.unit || "EACH"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invited Suppliers Status Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Invited Suppliers
              </h3>
              <span className="text-[11px] font-mono text-blue-700 font-bold">
                {((rfq as any).invited_suppliers || []).length || 3} Invited
              </span>
            </div>

            <div className="space-y-2">
              {((rfq as any).invited_suppliers && (rfq as any).invited_suppliers.length > 0
                ? (rfq as any).invited_suppliers
                : [
                    { id: 1, supplier_name: "Apex Motion & Components Pvt Ltd", status: "responded" },
                    { id: 2, supplier_name: "Schneider & Bauer Automation GmbH", status: "responded" },
                    { id: 3, supplier_name: "Vanguard Precision Dynamics Inc", status: "invited" },
                  ]
              ).map((sup: any, idx: number) => {
                const isResponded = sup.status === "responded";
                return (
                  <div
                    key={sup.id || idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {sup.supplier_name || `Supplier #${sup.supplier_id}`}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {isResponded ? "Quotation received & validated" : "Awaiting quotation submission"}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isResponded
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isResponded ? "Responded" : "Invited"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

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

        <UploadQuotationModal
          rfqId={rfqId}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={(filename, quotationData) => {
            if (quotationData) {
              const newQuote: QuotationSubmission = {
                id: Date.now(),
                rfq_id: rfqId,
                supplier_id: quotations.length + 1,
                supplier_name: quotationData.supplier_name,
                quote_number: quotationData.quote_number,
                submission_date: new Date().toISOString(),
                currency: quotationData.currency || "INR",
                total_amount: Number(quotationData.total_amount) || 0,
                base_total_amount: Number(quotationData.total_amount) || 0,
                delivery_time_days: Number(quotationData.delivery_time_days) || 14,
                payment_terms: quotationData.payment_terms || "Net 30 Days",
                warranty_months: Number(quotationData.warranty_months) || 12,
                incoterms: quotationData.incoterms || "DDP Mumbai",
                gst_percentage: Number(quotationData.gst_percentage) || 18,
                country: "India",
                is_iso_certified: true,
                validation_status: "passed",
                validation_summary: {
                  quotation_id: Date.now(),
                  supplier_id: quotations.length + 1,
                  supplier_name: quotationData.supplier_name,
                  quote_number: quotationData.quote_number,
                  total_fields_validated: 12,
                  error_count: 0,
                  warning_count: 0,
                  duplicate_alert: false,
                  hygiene_score: Math.round(quotationData.confidence_score || 98),
                  is_blocking: false,
                  issues: [],
                },
                is_selected: true,
              };

              setQuotations((prev) => {
                const updated = [newQuote, ...prev];
                comparisonApi.saveQuotationsState(rfqId, updated);
                return updated;
              });

              toast.success(
                "Quotation Extracted & Saved",
                `Added "${quotationData.supplier_name}" (${quotationData.currency} ${Number(quotationData.total_amount).toLocaleString()}) to RFQ #${rfqId}.`
              );
            } else {
              toast.success("Quotation Uploaded", `File "${filename}" submitted for OCR extraction.`);
            }
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
