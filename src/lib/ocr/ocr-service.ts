import { OcrExtractedRow } from './types'
import { extractDataFromScreenshot } from './mock-ocr-service'

export interface OcrService {
  extractFromImage(file: File, company: 'AXA' | 'AIA'): Promise<OcrExtractedRow[]>
}

class GeminiOcrService implements OcrService {
  async extractFromImage(file: File, company: 'AXA' | 'AIA'): Promise<OcrExtractedRow[]> {
    // TODO: Implement actual Gemini API multimodal OCR screenshot parser.
    // e.g., initialize GeminiClient using @google/generative-ai, pass file buffer and schema instructions.
    
    // For Phase 1 / Core MVP, we default to the high-fidelity mock OCR generator.
    return extractDataFromScreenshot(file, company)
  }
}

let ocrServiceInstance: OcrService | null = null

export function getOcrService(): OcrService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new GeminiOcrService()
  }
  return ocrServiceInstance
}
