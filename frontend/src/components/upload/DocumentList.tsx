"use client";

import React, { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  Code2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  DollarSign,
  Calendar,
  Layers,
  X,
} from "lucide-react";
import { UploadedDocument } from "@/lib/types";
import { formatFileSize, formatDate } from "@/lib/utils";

interface DocumentListProps {
  documents: UploadedDocument[];
  onDeleteDocument: (id: string) => void;
}

export function DocumentList({ documents, onDeleteDocument }: DocumentListProps) {
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocument | null>(null);

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
        <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-800">No documents ingested yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Upload quotation PDFs or use the quick sample loader above to trigger the OCR + AI extraction pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Ingested Quotation Documents ({documents.length})
          </h3>
          <p className="text-xs text-slate-500">
            OCR extracted and structured into standard schema for Phase 2 comparison
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Document / Supplier</th>
                <th className="py-3 px-4">OCR Engine</th>
                <th className="py-3 px-4">Extracted Quote Value</th>
                <th className="py-3 px-4">Delivery Terms</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Name and File Details */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {doc.extracted_data?.supplier_name || doc.filename}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-slate-400">{doc.id}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.filesize)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* OCR Engine */}
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px]">
                      {doc.ocr_engine || "PaddleOCR"}
                    </span>
                    {doc.extracted_data?.confidence_score && (
                      <span className="block text-[10px] text-emerald-700 font-medium mt-1">
                        {doc.extracted_data.confidence_score}% Confidence
                      </span>
                    )}
                  </td>

                  {/* Extracted Value */}
                  <td className="py-3.5 px-4">
                    {doc.extracted_data?.total_amount ? (
                      <div>
                        <span className="font-bold font-mono text-slate-900">
                          {doc.extracted_data.currency || "$"}{" "}
                          {doc.extracted_data.total_amount.toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {doc.extracted_data.line_items_count || 1} Line Items
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Processing...</span>
                    )}
                  </td>

                  {/* Terms */}
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800">
                      {doc.extracted_data?.delivery_time_days
                        ? `${doc.extracted_data.delivery_time_days} Days Lead`
                        : "Standard"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {doc.extracted_data?.payment_terms || "Net 30 Days"}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Ingested
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors inline-flex items-center gap-1"
                        title="View Extracted JSON Schema"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Inspect Schema</span>
                      </button>

                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Schema Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Extracted Schema Inspection (Procurement Data Model)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedDoc.filename} • ID: {selectedDoc.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium">Supplier</span>
                  <p className="font-bold text-slate-900 truncate mt-0.5">
                    {selectedDoc.extracted_data?.supplier_name || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium">Quote #</span>
                  <p className="font-bold text-slate-900 font-mono truncate mt-0.5">
                    {selectedDoc.extracted_data?.quote_number || "N/A"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium">Total Value</span>
                  <p className="font-bold text-emerald-700 font-mono truncate mt-0.5">
                    {selectedDoc.extracted_data?.currency || "$"}{" "}
                    {selectedDoc.extracted_data?.total_amount?.toLocaleString() || "0"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium">Confidence</span>
                  <p className="font-bold text-blue-700 font-mono truncate mt-0.5">
                    {selectedDoc.extracted_data?.confidence_score}%
                  </p>
                </div>
              </div>

              {/* Raw JSON viewer */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Structured Pydantic Model Output (JSON):
                </span>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  {JSON.stringify(
                    {
                      document_id: selectedDoc.id,
                      filename: selectedDoc.filename,
                      ocr_engine: selectedDoc.ocr_engine,
                      extracted_at: selectedDoc.created_at,
                      schema_data: selectedDoc.extracted_data,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
