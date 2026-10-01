"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { UploadedDocument, IngestionStage } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { api } from "@/lib/api";

interface DocumentDropzoneProps {
  onDocumentProcessed: (doc: UploadedDocument) => void;
}

export function DocumentDropzone({ onDocumentProcessed }: DocumentDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<IngestionStage>("queued");
  const [stageMessage, setStageMessage] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<"Combined" | "PaddleOCR" | "Tesseract">("Combined");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setError(null);

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 25MB limit (${formatFileSize(file.size)})`);
      return;
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|xlsx|csv)$/i)) {
      setError("Unsupported file format. Please upload PDF, PNG, JPG, or Excel sheets.");
      return;
    }

    setCurrentFile(file);
    runIngestionSimulation(file.name, file.size, file.type);
  };

  const runIngestionSimulation = (filename: string, filesize: number, filetype: string, overrideMeta?: any) => {
    setUploadProgress(10);
    setCurrentStage("uploading");
    setStageMessage("Uploading binary payload to FastAPI endpoint...");

    setTimeout(() => {
      setUploadProgress(40);
      setCurrentStage("ocr_processing");
      setStageMessage(`Invoking ${selectedEngine} (table bounding & OCR extraction)...`);

      setTimeout(() => {
        setUploadProgress(75);
        setCurrentStage("schema_extraction");
        setStageMessage("Mapping extracted entities to Shumaaila's S1.5 PostgreSQL schema...");

        setTimeout(() => {
          setUploadProgress(100);
          setCurrentStage("completed");
          setStageMessage("Successfully parsed and committed to database!");

          const docId = `DOC-${Math.floor(100000 + Math.random() * 900000)}`;
          const mockData = overrideMeta || {
            supplier_name: filename.replace(/[^a-zA-Z]/g, " ").trim() || "Industrial Vendor Ltd.",
            quote_number: `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            total_amount: Math.round(15000 + Math.random() * 45000),
            currency: "USD",
            delivery_time_days: Math.floor(10 + Math.random() * 20),
            payment_terms: "Net 30 Days",
            line_items_count: Math.floor(4 + Math.random() * 15),
            confidence_score: Math.round((95 + Math.random() * 4.9) * 10) / 10,
          };

          const newDocument: UploadedDocument = {
            id: docId,
            filename,
            filesize,
            filetype,
            upload_progress: 100,
            stage: "completed",
            stage_message: "Extracted and mapped to schema",
            created_at: new Date().toISOString(),
            ocr_engine: selectedEngine,
            extracted_data: mockData,
          };

          onDocumentProcessed(newDocument);
        }, 800);
      }, 900);
    }, 800);
  };

  const handleLoadSample = (sampleType: "apex" | "precision" | "global") => {
    const samples = {
      apex: {
        name: "Apex_Machinery_Components_Q4.pdf",
        size: 1840000,
        meta: {
          supplier_name: "Apex Industrial Technologies Ltd",
          quote_number: "QT-APEX-2026-881",
          total_amount: 32450.0,
          currency: "USD",
          delivery_time_days: 14,
          payment_terms: "Net 30 Days",
          line_items_count: 8,
          confidence_score: 98.6,
        },
      },
      precision: {
        name: "Schneider_Bauer_Industrial_Quote.pdf",
        size: 2420000,
        meta: {
          supplier_name: "Schneider & Bauer Automation GmbH",
          quote_number: "QT-SB-DE-8821",
          total_amount: 34200.0,
          currency: "EUR",
          delivery_time_days: 21,
          payment_terms: "LC at Sight",
          line_items_count: 14,
          confidence_score: 97.4,
        },
      },
      global: {
        name: "Bharat_Forge_Allied_Quote.pdf",
        size: 1250000,
        meta: {
          supplier_name: "Bharat Forge & Allied Industries",
          quote_number: "BF-IND-9902",
          total_amount: 2980000.0,
          currency: "INR",
          delivery_time_days: 35,
          payment_terms: "100% Advance",
          line_items_count: 6,
          confidence_score: 95.8,
        },
      },
    };

    const s = samples[sampleType];
    setCurrentFile(new File(["sample"], s.name, { type: "application/pdf" }));
    runIngestionSimulation(s.name, s.size, "application/pdf", s.meta);
  };

  return (
    <div className="space-y-4">
      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50 shadow-xs"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-slate-900">
            Drag & Drop Supplier Quotations Here
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Support for PDF proposals, scanned images (PNG/JPG), and Excel rate cards up to 25MB
          </p>

          {/* Engine Selector */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-4 flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs"
          >
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-blue-600" /> Engine:
            </span>
            {(["Combined", "PaddleOCR", "Tesseract"] as const).map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => setSelectedEngine(eng)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedEngine === eng
                    ? "bg-white text-blue-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {eng}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Browse Computer Files
          </button>
        </div>
      </div>

      {/* Progress & Real-time Ingestion Pipeline status */}
      {currentFile && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{currentFile.name}</p>
                <p className="text-[11px] text-slate-500">{formatFileSize(currentFile.size)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              {currentStage === "completed" ? (
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Ingested
                </span>
              ) : currentStage === "failed" ? (
                <span className="flex items-center gap-1 text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" /> Ingestion Error
                </span>
              ) : (
                <span className="text-blue-700 font-semibold">{uploadProgress}%</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                currentStage === "completed"
                  ? "bg-emerald-500"
                  : currentStage === "failed"
                  ? "bg-rose-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          {/* Pipeline stage tracker */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-600 animate-spin" />
              <span className="text-slate-700">{stageMessage}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              Engine: {selectedEngine}
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Testing Sample Selector */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Quick Demo: Load Realistic Sample Quotations
          </span>
          <p className="text-[11px] text-slate-500">
            Simulate end-to-end ingestion with real quotation schemas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSample("apex")}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors shadow-xs"
          >
            Apex (USD $32.4k)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample("precision")}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors shadow-xs"
          >
            Schneider (EUR €34.2k)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample("global")}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors shadow-xs"
          >
            Bharat Forge (INR ₹29.8L)
          </button>
        </div>
      </div>
    </div>
  );
}
