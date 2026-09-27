export type UserRole = "buyer" | "manager" | "admin" | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

export type IngestionStage = 
  | "queued" 
  | "uploading" 
  | "ocr_processing" 
  | "schema_extraction" 
  | "completed" 
  | "failed";

export interface ExtractedDataPreview {
  supplier_name?: string;
  quote_number?: string;
  total_amount?: number;
  currency?: string;
  delivery_time_days?: number;
  payment_terms?: string;
  line_items_count?: number;
  confidence_score?: number;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  filesize: number;
  filetype: string;
  upload_progress: number;
  stage: IngestionStage;
  stage_message: string;
  created_at: string;
  ocr_engine?: "PaddleOCR" | "Tesseract" | "Combined";
  extracted_data?: ExtractedDataPreview;
  error_message?: string;
}
