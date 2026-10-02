"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentDropzone } from "@/components/upload/DocumentDropzone";
import { DocumentList } from "@/components/upload/DocumentList";
import { UploadedDocument } from "@/lib/types";
import { RFQItem } from "@/lib/comparison-types";
import { comparisonApi } from "@/lib/comparison-api";
import {
  FileUp,
  Shield,
  Cpu,
  Sparkles,
  Database,
  CheckCircle2,
  FolderGit2,
  Building2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface InvitedSupplierItem {
  id: number;
  supplier_id?: number;
  supplier_name: string;
  status?: string;
  email?: string;
}

function DocumentUploadContent() {
  const searchParams = useSearchParams();
  const rfqIdParam = searchParams.get("rfqId");

  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(true);
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(
    rfqIdParam ? Number(rfqIdParam) : null
  );
  const [invitedSuppliers, setInvitedSuppliers] = useState<InvitedSupplierItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Load existing uploaded docs from storage
  useEffect(() => {
    const saved = localStorage.getItem("procurapilot_docs");
    if (saved) {
      try {
        setDocuments(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    const initialDocs: UploadedDocument[] = [
      {
        id: "DOC-891042",
        filename: "Apex_Industrial_Quotation_Q4.pdf",
        filesize: 1420000,
        filetype: "application/pdf",
        upload_progress: 100,
        stage: "completed",
        stage_message: "Extracted and mapped to schema",
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        ocr_engine: "Combined",
        extracted_data: {
          supplier_name: "Apex Industrial Supplies Ltd.",
          quote_number: "QT-2026-8841",
          total_amount: 32450.0,
          currency: "USD",
          delivery_time_days: 15,
          payment_terms: "Net 30 Days",
          line_items_count: 8,
          confidence_score: 98.4,
        },
      },
      {
        id: "DOC-772194",
        filename: "Precision_Steel_Dynamics_Quote_2026.pdf",
        filesize: 2150000,
        filetype: "application/pdf",
        upload_progress: 100,
        stage: "completed",
        stage_message: "Extracted and mapped to schema",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        ocr_engine: "PaddleOCR",
        extracted_data: {
          supplier_name: "Precision Steel Dynamics",
          quote_number: "PSD-9921-A",
          total_amount: 28900.0,
          currency: "USD",
          delivery_time_days: 21,
          payment_terms: "Net 45 Days",
          line_items_count: 12,
          confidence_score: 97.1,
        },
      },
    ];
    setDocuments(initialDocs);
    localStorage.setItem("procurapilot_docs", JSON.stringify(initialDocs));
  }, []);

  // Fetch RFQs for dropdown
  useEffect(() => {
    async function loadRfqs() {
      setLoadingRfqs(true);
      try {
        const data = await comparisonApi.getRFQs();
        setRfqs(data);

        // Preselect RFQ if query param exists, else first active RFQ
        if (rfqIdParam) {
          const matched = data.find((r) => r.id === Number(rfqIdParam));
          if (matched) {
            setSelectedRfqId(matched.id);
          } else if (data.length > 0) {
            setSelectedRfqId(data[0].id);
          }
        } else if (data.length > 0 && !selectedRfqId) {
          setSelectedRfqId(data[0].id);
        }
      } catch (err) {
        console.warn("Failed to fetch RFQs for upload selector:", err);
      } finally {
        setLoadingRfqs(false);
      }
    }
    loadRfqs();
  }, [rfqIdParam]);

  // When selectedRfqId changes, fetch or extract invited suppliers
  useEffect(() => {
    if (!selectedRfqId) {
      setInvitedSuppliers([]);
      setSelectedSupplierId(null);
      return;
    }

    async function loadSuppliersForRFQ() {
      setLoadingSuppliers(true);
      try {
        const rfqDetail = await comparisonApi.getRFQById(selectedRfqId!);
        const suppliers: InvitedSupplierItem[] = [];

        if (rfqDetail && (rfqDetail as any).invited_suppliers?.length > 0) {
          (rfqDetail as any).invited_suppliers.forEach((s: any) => {
            suppliers.push({
              id: s.supplier_id || s.id,
              supplier_id: s.supplier_id || s.id,
              supplier_name: s.supplier_name || `Supplier #${s.supplier_id || s.id}`,
              status: s.status || "invited",
              email: s.email,
            });
          });
        } else {
          // Fallback demo suppliers for seed/mock RFQs
          suppliers.push(
            { id: 1, supplier_id: 1, supplier_name: "Apex Motion & Components Pvt Ltd", status: "responded" },
            { id: 2, supplier_id: 2, supplier_name: "Schneider & Bauer Automation GmbH", status: "responded" },
            { id: 3, supplier_id: 3, supplier_name: "Vanguard Precision Dynamics Inc", status: "invited" }
          );
        }

        setInvitedSuppliers(suppliers);
        if (suppliers.length > 0) {
          setSelectedSupplierId(suppliers[0].supplier_id || suppliers[0].id);
        } else {
          setSelectedSupplierId(null);
        }
      } catch (err) {
        console.warn("Error loading RFQ suppliers:", err);
      } finally {
        setLoadingSuppliers(false);
      }
    }

    loadSuppliersForRFQ();
  }, [selectedRfqId]);

  const handleDocumentProcessed = (newDoc: UploadedDocument) => {
    setDocuments((prev) => {
      const updated = [newDoc, ...prev];
      localStorage.setItem("procurapilot_docs", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem("procurapilot_docs", JSON.stringify(updated));
      return updated;
    });
  };

  const currentRfq = rfqs.find((r) => r.id === selectedRfqId);
  const currentSupplier = invitedSuppliers.find(
    (s) => (s.supplier_id || s.id) === selectedSupplierId
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Document Ingestion Pipeline
              </span>
              <span className="text-[11px] text-slate-300">•</span>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready for Quotations
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Quotation Ingestion & OCR Processing
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Upload multi-format supplier bids. PaddleOCR and Tesseract extract raw tables and text, normalized via LLM schemas and bound to target RFQs in PostgreSQL.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/rfq"
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 shadow-xs text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-blue-600" />
              <span>RFQ Workspaces</span>
            </Link>
          </div>
        </div>

        {/* Technical Architecture Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Drag & Drop Upload Module</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Supports PDF proposals, Excel RFQ sheets, and scanned PNG/JPG receipts up to 25MB.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Hybrid OCR Extraction</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                PaddleOCR (table boundary detection) combined with Tesseract for multilingual character precision.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">RFQ & Supplier Binding</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Binds quotation directly to active RFQs, checks invited supplier authorization, and increments bid counts.
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: RFQ & INITED SUPPLIER SELECTION CARD */}
        <section className="bg-white rounded-2xl border border-blue-100 shadow-xs p-5 space-y-4 bg-gradient-to-br from-white via-white to-blue-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-600" />
                <span>Target RFQ & Supplier Identification</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select which active Request for Quotation this incoming supplier bid belongs to.
              </p>
            </div>
            {currentRfq && (
              <Link
                href={`/rfq/${currentRfq.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>View RFQ #{currentRfq.rfq_number}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RFQ Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Which RFQ is this quotation for? <span className="text-red-500">*</span>
              </label>
              {loadingRfqs ? (
                <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
              ) : (
                <select
                  id="select-rfq"
                  value={selectedRfqId || ""}
                  onChange={(e) => setSelectedRfqId(Number(e.target.value) || null)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {rfqs.length === 0 ? (
                    <option value="">No RFQs found (Create an RFQ first)</option>
                  ) : (
                    rfqs.map((rfq) => (
                      <option key={rfq.id} value={rfq.id}>
                        {rfq.rfq_number} — {rfq.title} ({rfq.category})
                      </option>
                    ))
                  )}
                </select>
              )}
              <p className="text-[11px] text-slate-400">
                Only active RFQs accept incoming quotation bids.
              </p>
            </div>

            {/* Supplier Dropdown (Filtered to invited only) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Invited Supplier <span className="text-red-500">*</span>
              </label>
              {loadingSuppliers ? (
                <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
              ) : (
                <select
                  id="select-supplier"
                  value={selectedSupplierId || ""}
                  onChange={(e) => setSelectedSupplierId(Number(e.target.value) || null)}
                  disabled={invitedSuppliers.length === 0}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {invitedSuppliers.length === 0 ? (
                    <option value="">No invited suppliers for this RFQ</option>
                  ) : (
                    invitedSuppliers.map((sup) => {
                      const idVal = sup.supplier_id || sup.id;
                      return (
                        <option key={idVal} value={idVal}>
                          {sup.supplier_name} {sup.status ? `(${sup.status.toUpperCase()})` : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              )}
              <p className="text-[11px] text-slate-400">
                Filtered strictly to suppliers invited during RFQ creation.
              </p>
            </div>
          </div>

          {currentRfq && currentSupplier && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Linking quote to <strong>{currentRfq.rfq_number}</strong> for vendor{" "}
                  <strong>{currentSupplier.supplier_name}</strong>.
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                Target RFQ #{currentRfq.id}
              </span>
            </div>
          )}
        </section>

        {/* Drag and Drop Upload Component */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Upload Quotation Document</h2>
            <span className="text-[11px] text-slate-500 font-mono">FastAPI /api/v1/extraction/upload</span>
          </div>
          <DocumentDropzone
            onDocumentProcessed={handleDocumentProcessed}
            rfqId={selectedRfqId}
            supplierId={selectedSupplierId}
          />
        </section>

        {/* Uploaded Ingested Documents List */}
        <section className="pt-2">
          <DocumentList documents={documents} onDeleteDocument={handleDeleteDocument} />
        </section>
      </div>
    </AppLayout>
  );
}

export default function DocumentUploadPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          </div>
        </AppLayout>
      }
    >
      <DocumentUploadContent />
    </Suspense>
  );
}
