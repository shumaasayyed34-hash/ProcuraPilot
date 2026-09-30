"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentDropzone } from "@/components/upload/DocumentDropzone";
import { DocumentList } from "@/components/upload/DocumentList";
import { UploadedDocument } from "@/lib/types";
import { FileUp, Shield, Cpu, Sparkles, Database, CheckCircle2 } from "lucide-react";

export default function DocumentUploadPage() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  // Initialize with initial sample data if empty so the UI looks active and ready immediately
  useEffect(() => {
    const saved = localStorage.getItem("procurapilot_docs");
    if (saved) {
      try {
        setDocuments(JSON.parse(saved));
        return;
      } catch (e) {
        // Fallback to sample
      }
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

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold">
                Phase 1 • Ingestion Pipeline
              </span>
              <span className="text-[11px] text-slate-500">•</span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready for Quotations
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Document Ingestion & OCR Processing
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload multi-format supplier bids. PaddleOCR and Tesseract extract raw tables and text, normalized via LLM schemas into PostgreSQL & MongoDB.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-[10px] text-slate-400">PostgreSQL Target</p>
                <p className="font-semibold text-slate-200">16 DB Tables Mapped</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Architecture Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Drag & Drop Upload Module</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF proposals, Excel RFQ sheets, and scanned PNG/JPG receipts up to 25MB.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Hybrid OCR Extraction</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PaddleOCR (table boundary detection) combined with Tesseract for multilingual character precision.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Standard Schema Normalization</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Standardizes pricing, Incoterms, tax/GST, and payment milestones for Phase 2 validation.
              </p>
            </div>
          </div>
        </div>

        {/* Drag and Drop Upload Component */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Upload New Quotation</h2>
            <span className="text-[11px] text-slate-500">FastAPI /api/v1/documents/upload</span>
          </div>
          <DocumentDropzone onDocumentProcessed={handleDocumentProcessed} />
        </section>

        {/* Uploaded Ingested Documents List */}
        <section className="pt-4">
          <DocumentList documents={documents} onDeleteDocument={handleDeleteDocument} />
        </section>
      </div>
    </AppLayout>
  );
}
