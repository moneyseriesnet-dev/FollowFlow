import { OcrExtractedRow } from './types'

const AXA_PLANS = ['iShield', 'Life Ready', 'Smart Save', 'Pro Life', 'Retire Choice']
const AIA_PLANS = ['Health Happy', 'Infinite Care', 'AIA Ananya', 'Prestige Health', 'AIA Legacy']

const THAI_NAMES = [
  'สมชาย รักดี',
  'สมศรี มีสุข',
  'วิชัย เกียรติดำรง',
  'อนันต์ ปัญญาดี',
  'นภา รุ่งเรือง',
  'สุรพล แสนสุข',
  'กิตติเดช เจริญสุข',
  'นัฐพงษ์ แก้วดี',
  'อรทัย แสงทอง',
  'จารุวรรณ สินทวี',
  'มงคล ชัยประเสริฐ',
  'พิมพา ทรัพย์อนันต์',
]

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function extractDataFromScreenshot(
  imageFile: File,
  sourceCompany: 'AXA' | 'AIA'
): Promise<OcrExtractedRow[]> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const rowCount = getRandomNumber(2, 4)
  const results: OcrExtractedRow[] = []

  for (let i = 0; i < rowCount; i++) {
    const customerName = getRandomItem(THAI_NAMES)
    const policyNumber =
      sourceCompany === 'AXA'
        ? `AXA-${getRandomNumber(1000000, 9999999)}`
        : `AIA-${getRandomNumber(1000000, 9999999)}`
    const planName = sourceCompany === 'AXA' ? getRandomItem(AXA_PLANS) : getRandomItem(AIA_PLANS)
    const premiumAmount = getRandomNumber(1200, 35000)
    const paymentFrequency = getRandomItem(['monthly', 'quarterly', 'annual'])

    // Generate upcoming due date (next 30 days)
    const today = new Date()
    const dueOffset = getRandomNumber(5, 30)
    const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dueOffset)
    const dueDateString = dueDate.toISOString().split('T')[0]

    // Generate realistic birth date (ages 25-60)
    const birthYear = today.getFullYear() - getRandomNumber(25, 60)
    const birthMonth = getRandomNumber(0, 11)
    const birthDay = getRandomNumber(1, 28)
    const birthDate = new Date(birthYear, birthMonth, birthDay)
    const birthDateString = birthDate.toISOString().split('T')[0]

    const confidenceScore = parseFloat((Math.random() * 0.24 + 0.75).toFixed(2)) // 0.75 - 0.99

    results.push({
      detected_customer_name: customerName,
      detected_policy_number: policyNumber,
      detected_company: sourceCompany,
      detected_plan_name: planName,
      detected_premium_amount: premiumAmount,
      detected_payment_frequency: paymentFrequency,
      detected_due_date: dueDateString,
      detected_birth_date: birthDateString,
      confidence_score: confidenceScore,
      raw_ocr_text: `Screenshot line ${i + 1}: Name ${customerName} | Policy No ${policyNumber} | Plan ${planName} | Premium ${premiumAmount} THB | Due date ${dueDateString}`,
    })
  }

  return results
}
