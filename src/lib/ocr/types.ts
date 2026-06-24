/**
 * OCR Import Types
 *
 * Core type definitions for the OCR screenshot import pipeline.
 * These types flow through: Upload → OCR Processing → Review → Import.
 */

/** A single row of data extracted from an insurance screenshot by OCR */
export interface OcrExtractedRow {
  detected_customer_name: string | null;
  detected_policy_number: string | null;
  detected_company: 'AXA' | 'AIA' | 'OTHER' | null;
  detected_plan_name: string | null;
  detected_premium_amount: number | null;
  detected_payment_frequency: string | null;
  detected_due_date: string | null;
  detected_birth_date: string | null;
  confidence_score: number | null;
  raw_ocr_text: string | null;
}

/** The result of processing a single screenshot through OCR */
export interface OcrResult {
  rows: OcrExtractedRow[];
  source_company: 'AXA' | 'AIA';
  image_url: string;
  raw_text: string;
}

/** Steps in the import wizard */
export type ImportStep = 'upload' | 'processing' | 'review' | 'importing' | 'complete';

/** Full state of the import wizard (client-side) */
export interface ImportState {
  step: ImportStep;
  sourceCompany: 'AXA' | 'AIA' | null;
  files: File[];
  batchId: string | null;
  draftRows: DraftRow[];
  error: string | null;
}

/** A draft row with review metadata, used in the review step */
export interface DraftRow extends OcrExtractedRow {
  id: string;
  image_id: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'edited';
  isEditing: boolean;
}

/** Results returned after the final import step */
export interface ImportResult {
  customersCreated: number;
  customersMatched: number;
  policiesCreated: number;
  policiesUpdated: number;
}
