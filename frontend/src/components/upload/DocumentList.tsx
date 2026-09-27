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
      <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80">
        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">No documents ingested yet</h4>
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
          <h3 className="text-sm font-bold text-slate-200">
            Ingested Quotation Documents ({documents.length})
          </h3>
          <p className="text-xs text-slate-400">
            OCR extracted and structured into standard schema for Phase 2 comparison
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Document / Supplier</th>
                <th className="py-3 px-4">OCR Engine</th>
                <th className="py-3 px-4">Extracted Quote Value</th>
                <th className="py-3 px-4">Delivery Terms</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  {/* Name and File Details */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">
                          {doc.extracted_data?.supplier_name || doc.filename}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-500">{doc.id}</span>
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
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                      {doc.ocr_engine || "PaddleOCR"}
                    </span>
                    {doc.extracted_data?.confidence_score && (
                      <span className="block text-[10px] text-emerald-400 font-medium mt-1">
                        {doc.extracted_data.confidence_score}% match
                      </span>
                    )}
                  </td>

                  {/* Extracted Quote Value */}
                  <td className="py-3.5 px-4">
                    {doc.extracted_data?.total_amount ? (
                      <div>
                        <span className="font-bold text-slate-100 text-sm">
                          ${doc.extracted_data.total_amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          {doc.extracted_data.currency || "USD"}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {doc.extracted_data.line_items_count || 1} line items
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Processing...</span>
                    )}
                  </td>

                  {/* Delivery Terms */}
                  <td className="py-3.5 px-4">
                    {doc.extracted_data?.delivery_time_days ? (
                      <div>
                        <span className="font-medium text-slate-200">
                          {doc.extracted_data.delivery_time_days} days
                        </span>
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {doc.extracted_data.payment_terms || "Standard"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">—</span>
                    )}
                  </td>

                  {/* Ingestion Status */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      Schema Stored
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Inspect Schema"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Schema</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Document"
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

      {/* Schema Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-slate-100 text-sm">
                  Extracted Schema: {selectedDoc.filename}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Supplier</p>
                  <p className="font-bold text-slate-200 mt-1 text-xs truncate">
                    {selectedDoc.extracted_data?.supplier_name}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Amount</p>
                  <p className="font-bold text-slate-200 mt-1 text-xs">
                    ${selectedDoc.extracted_data?.total_amount?.toLocaleString()}{" "}
                    {selectedDoc.extracted_data?.currency}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Lead Time</p>
                  <p className="font-bold text-slate-200 mt-1 text-xs">
                    {selectedDoc.extracted_data?.delivery_time_days} Days
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">OCR Confidence</p>
                  <p className="font-bold text-emerald-400 mt-1 text-xs">
                    {selectedDoc.extracted_data?.confidence_score}%
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Standard PostgreSQL / MongoDB Schema Representation:
                </label>
                <pre className="p-4 rounded-xl bg-slate-950 text-indigo-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  {JSON.stringify(
                    {
                      document_id: selectedDoc.id,
                      file_name: selectedDoc.filename,
                      ocr_engine: selectedDoc.ocr_engine,
                      ingestion_stage: selectedDoc.stage,
                      created_at: selectedDoc.created_at,
                      schema_fields: selectedDoc.extracted_data,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
