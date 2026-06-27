/**
 * CSV / Text File Parser Service
 *
 * Uses Gemini AI to intelligently parse CSV or plain-text insurance data
 * into the same OcrExtractedRow structure used by the image OCR pipeline.
 * This allows flexible import regardless of column order or text format.
 */

import { OcrExtractedRow } from './types'

export interface CsvParseService {
  extractFromText(content: string, company: 'AXA' | 'AIA'): Promise<OcrExtractedRow[]>
}

class GeminiCsvParseService implements CsvParseService {
  async extractFromText(content: string, company: 'AXA' | 'AIA'): Promise<OcrExtractedRow[]> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set. Falling back to naive CSV parser.')
      return naiveCsvParse(content, company)
    }

    try {
      const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const schema = {
        type: SchemaType.ARRAY,
        description: `List of insurance policy records parsed from ${company} CSV/text data.`,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            detected_customer_name: {
              type: SchemaType.STRING,
              description: "Customer's full name in Thai or English.",
            },
            detected_policy_number: {
              type: SchemaType.STRING,
              description: `Policy number, typically starting with ${company} prefix.`,
            },
            detected_company: {
              type: SchemaType.STRING,
              description: `Insurance company. Must be '${company}' or 'OTHER'.`,
            },
            detected_plan_name: {
              type: SchemaType.STRING,
              description: 'Insurance plan or product name.',
            },
            detected_premium_amount: {
              type: SchemaType.NUMBER,
              description: 'Numeric premium payment amount (no currency symbol).',
            },
            detected_payment_frequency: {
              type: SchemaType.STRING,
              description: "Payment frequency: 'monthly', 'quarterly', 'semi_annual', or 'annual'.",
            },
            detected_due_date: {
              type: SchemaType.STRING,
              description: 'Next premium due date in YYYY-MM-DD format.',
            },
            detected_birth_date: {
              type: SchemaType.STRING,
              description: "Customer's date of birth in YYYY-MM-DD format, or null if not present.",
            },
            confidence_score: {
              type: SchemaType.NUMBER,
              description: 'Confidence level of extraction, 0.0 to 1.0.',
            },
            raw_ocr_text: {
              type: SchemaType.STRING,
              description: 'The original raw text row or segment that this record was extracted from.',
            },
            ai_comment: {
              type: SchemaType.STRING,
              description:
                'If any field is ambiguous, missing, or needs human review, describe the issue in Thai. Leave null if everything is clear.',
            },
          },
          required: [
            'detected_customer_name',
            'detected_policy_number',
            'detected_company',
            'detected_plan_name',
            'detected_premium_amount',
            'detected_payment_frequency',
            'detected_due_date',
          ],
        },
      }

      const prompt = `You are a professional data extraction agent for FollowFlow CRM.
You are given raw CSV or plain text data from ${company} Insurance.
Parse every record (row/entry) in the data and extract the insurance policy details.

Rules:
- Convert date fields to YYYY-MM-DD format. If you encounter Buddhist Era (พ.ศ.) years, subtract 543 to convert to Christian Era.
- Strip currency symbols (฿, THB, บาท) from premium amounts — output numeric values only.
- Map payment frequencies to: 'monthly', 'quarterly', 'semi_annual', or 'annual'.
- If a column is missing or unclear, flag it in 'ai_comment' in Thai so a human can verify.
- If the text is not structured data at all, return an empty array.

Here is the CSV/text content to parse:
---
${content.slice(0, 20000)}
---

Return all records as a JSON array.`

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema as any,
        },
      })

      const responseText = result.response.text()
      if (!responseText) throw new Error('Gemini returned empty response for CSV parsing.')

      const parsed = JSON.parse(responseText)

      return parsed.map((row: any) => ({
        detected_customer_name: row.detected_customer_name || null,
        detected_policy_number: row.detected_policy_number || null,
        detected_company: row.detected_company || company,
        detected_plan_name: row.detected_plan_name || null,
        detected_premium_amount: row.detected_premium_amount != null ? Number(row.detected_premium_amount) : null,
        detected_payment_frequency: row.detected_payment_frequency || 'annual',
        detected_due_date: row.detected_due_date || null,
        detected_birth_date: row.detected_birth_date || null,
        confidence_score: row.confidence_score != null ? Number(row.confidence_score) : 0.9,
        raw_ocr_text: row.raw_ocr_text || 'Extracted from CSV/text file via Gemini API',
        ai_comment: row.ai_comment || null,
      }))
    } catch (err: any) {
      console.error('Gemini CSV Parse Error:', err)
      return naiveCsvParse(content, company)
    }
  }
}

/**
 * Naive fallback: tries to parse a simple comma-separated CSV where headers
 * are in the first row and match expected column names loosely.
 */
function naiveCsvParse(content: string, company: 'AXA' | 'AIA'): OcrExtractedRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const results: OcrExtractedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    if (cols.length < 2) continue

    const get = (keywords: string[]): string | null => {
      for (const kw of keywords) {
        const idx = headers.findIndex((h) => h.includes(kw))
        if (idx !== -1 && cols[idx]) return cols[idx]
      }
      return null
    }

    const premiumRaw = get(['premium', 'เบี้ย', 'amount', 'จำนวน'])
    const premium = premiumRaw ? parseFloat(premiumRaw.replace(/[^0-9.]/g, '')) : null

    results.push({
      detected_customer_name: get(['name', 'ชื่อ', 'customer', 'ลูกค้า']),
      detected_policy_number: get(['policy', 'กรมธรรม์', 'number', 'no', 'เลข']),
      detected_company: company,
      detected_plan_name: get(['plan', 'แผน', 'product', 'ผลิตภัณฑ์']),
      detected_premium_amount: isNaN(premium!) ? null : premium,
      detected_payment_frequency: get(['frequency', 'งวด', 'period']) || 'annual',
      detected_due_date: get(['due', 'expire', 'วันครบ', 'date']) || null,
      detected_birth_date: get(['birth', 'เกิด', 'dob']) || null,
      confidence_score: 0.7,
      raw_ocr_text: lines[i],
      ai_comment: 'นำเข้าด้วย Naive Parser (ไม่มี Gemini API Key) — กรุณาตรวจสอบความถูกต้องของข้อมูลทุกฟิลด์',
    })
  }

  return results
}

let csvServiceInstance: CsvParseService | null = null

export function getCsvParseService(): CsvParseService {
  if (!csvServiceInstance) {
    csvServiceInstance = new GeminiCsvParseService()
  }
  return csvServiceInstance
}
