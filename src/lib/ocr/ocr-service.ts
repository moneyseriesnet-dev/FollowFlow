import { OcrExtractedRow } from './types'
import { extractDataFromScreenshot } from './mock-ocr-service'

export interface OcrService {
  extractFromImage(imageUrl: string, company: 'AXA' | 'AIA'): Promise<OcrExtractedRow[]>
}

class GeminiOcrService implements OcrService {
  async extractFromImage(imageUrl: string, company: 'AXA' | 'AIA'): Promise<OcrExtractedRow[]> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment variables. Falling back to Mock OCR Service.')
      const dummyFile = new File([], `screenshot.png`, { type: 'image/png' })
      return extractDataFromScreenshot(dummyFile, company)
    }

    try {
      let base64Data = ''
      let mimeType = 'image/png'

      if (imageUrl && imageUrl.startsWith('http')) {
        console.log(`Starting actual Gemini OCR for remote URL: ${imageUrl}`)
        
        // 2a. Fetch the image file bytes from remote URL
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${imageUrl} (${response.statusText})`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        mimeType = response.headers.get('content-type') || 'image/png'
        base64Data = buffer.toString('base64')
      } else if (imageUrl && imageUrl.startsWith('/uploads')) {
        console.log(`Starting actual Gemini OCR for local file fallback: ${imageUrl}`)
        
        // 2b. Read the image file bytes from local disk
        const fs = await import('fs/promises')
        const path = await import('path')
        const localPath = path.join(process.cwd(), 'public', imageUrl)
        
        const fileBuffer = await fs.readFile(localPath)
        base64Data = fileBuffer.toString('base64')
        
        const ext = path.extname(localPath).toLowerCase()
        if (ext === '.jpg' || ext === '.jpeg') {
          mimeType = 'image/jpeg'
        } else if (ext === '.webp') {
          mimeType = 'image/webp'
        } else {
          mimeType = 'image/png'
        }
      } else {
        console.log(`Invalid/mock URL pattern: ${imageUrl}. Using Mock OCR Service.`)
        const dummyFile = new File([], `screenshot.png`, { type: 'image/png' })
        return extractDataFromScreenshot(dummyFile, company)
      }

      // 3. Initialize Gemini Client dynamically
      const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      // 4. Define Response Schema
      const ocrSchema = {
        type: SchemaType.ARRAY,
        description: `List of client insurance details extracted from the ${company} screenshot.`,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            detected_customer_name: {
              type: SchemaType.STRING,
              description: "Customer/Insured person's full name in Thai. (e.g. 'สมชาย รักดี')"
            },
            detected_policy_number: {
              type: SchemaType.STRING,
              description: `The policy number, starting with prefix matching ${company} format.`
            },
            detected_company: {
              type: SchemaType.STRING,
              description: `The insurance company name. Must be exactly '${company}' or 'OTHER'.`
            },
            detected_plan_name: {
              type: SchemaType.STRING,
              description: "The name of the insurance plan."
            },
            detected_premium_amount: {
              type: SchemaType.NUMBER,
              description: "The numeric premium payment amount."
            },
            detected_payment_frequency: {
              type: SchemaType.STRING,
              description: "The payment frequency. Must be 'monthly', 'quarterly', 'semi-annual', or 'annual'."
            },
            detected_due_date: {
              type: SchemaType.STRING,
              description: "The next payment due date in YYYY-MM-DD format."
            },
            detected_birth_date: {
              type: SchemaType.STRING,
              description: "The customer's date of birth in YYYY-MM-DD format if visible."
            },
            confidence_score: {
              type: SchemaType.NUMBER,
              description: "Confidence level of extraction between 0.0 and 1.0."
            },
            raw_ocr_text: {
              type: SchemaType.STRING,
              description: "Snippet of raw text from the screenshot where this record was found."
            },
            ai_comment: {
              type: SchemaType.STRING,
              description: "If there is any ambiguity, unclear text, low confidence, or parts that need manual verification by a human, write a comment explaining what the issue is (in Thai). Otherwise, leave it empty or null."
            }
          },
          required: [
            "detected_customer_name",
            "detected_policy_number",
            "detected_company",
            "detected_plan_name",
            "detected_premium_amount",
            "detected_payment_frequency",
            "detected_due_date"
          ]
        }
      }

      const prompt = `You are a professional OCR agent for FollowFlow CRM.
Analyze this screenshot from ${company} Insurance.
Extract all customer policy records. For each record, extract:
- Customer name (usually in Thai)
- Policy number
- Plan name
- Premium amount (numeric)
- Payment frequency (e.g., monthly, quarterly, annual)
- Next premium due date (YYYY-MM-DD)
- Date of birth (YYYY-MM-DD), if present.

Additionally, assess the visual clarity and correctness of the values. If a value is cut off, blurry, ambiguous, or you are not completely sure (confidence < 0.85), provide a helpful comment in Thai in 'ai_comment' explaining which field is uncertain and why, so a human reviewer can verify it. If everything is clear and certain, you can leave it empty or null.
Return the extracted records in the specified JSON array schema.`

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ocrSchema as any
        }
      })

      const responseText = result.response.text()
      if (!responseText) {
        throw new Error('Gemini returned an empty response.')
      }

      console.log(`Gemini response:`, responseText)
      const parsedRows = JSON.parse(responseText)

      return parsedRows.map((row: any) => ({
        detected_customer_name: row.detected_customer_name || null,
        detected_policy_number: row.detected_policy_number || null,
        detected_company: row.detected_company || company,
        detected_plan_name: row.detected_plan_name || null,
        detected_premium_amount: row.detected_premium_amount ? Number(row.detected_premium_amount) : null,
        detected_payment_frequency: row.detected_payment_frequency || 'monthly',
        detected_due_date: row.detected_due_date || null,
        detected_birth_date: row.detected_birth_date || null,
        confidence_score: row.confidence_score ? Number(row.confidence_score) : 0.95,
        raw_ocr_text: row.raw_ocr_text || `Extracted from screenshot via Gemini API`,
        ai_comment: row.ai_comment || null,
      }))

    } catch (err: any) {
      console.error('Gemini OCR Service Error:', err)
      const dummyFile = new File([], `screenshot.png`, { type: 'image/png' })
      return extractDataFromScreenshot(dummyFile, company)
    }
  }
}

let ocrServiceInstance: OcrService | null = null

export function getOcrService(): OcrService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new GeminiOcrService()
  }
  return ocrServiceInstance
}
