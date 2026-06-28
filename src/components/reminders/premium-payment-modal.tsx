'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Calendar, Check, Loader2 } from 'lucide-react'

interface PremiumPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amountPaid: number, paymentDate: string) => Promise<void>
  defaultAmount: number
  planName: string
  policyNumber: string
  clientName: string
}

export default function PremiumPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  defaultAmount,
  planName,
  policyNumber,
  clientName
}: PremiumPaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState<string>(String(defaultAmount || ''))
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    // Current local date in YYYY-MM-DD
    const d = new Date()
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(String(defaultAmount || ''))
      setError(null)
    }
  }, [isOpen, defaultAmount])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amt = parseFloat(amountPaid)
    if (isNaN(amt) || amt < 0) {
      setError('กรุณาระบุจำนวนเงินที่ถูกต้อง')
      return
    }

    setLoading(true)
    try {
      // Pass the paymentDate along with a timestamp (midday local time to prevent TZ rollover issues)
      const fullISODate = new Date(`${paymentDate}T12:00:00`).toISOString()
      await onConfirm(amt, fullISODate)
      onClose()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลชำระเงิน')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              บันทึกการชำระเบี้ยประกันภัย
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              บันทึกยอดชำระเบี้ยจริงและเพิ่มข้อมูลเข้าประวัติกิจกรรม
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Policy Context Alert */}
        <div className="p-3.5 bg-indigo-50/55 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/30 space-y-1">
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">กรมธรรม์ที่ชำระเงิน</p>
          <div className="text-xs text-slate-700 dark:text-slate-350 space-y-0.5">
            <p className="font-semibold text-slate-900 dark:text-white">ลูกค้า: {clientName}</p>
            <p>แผนประกัน: {planName || '—'}</p>
            <p className="font-mono text-[11px]">เลขที่: {policyNumber}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              จำนวนเงินที่เก็บเบี้ยประกันได้ (บาท) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-semibold text-sm">฿</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="เช่น 24000.00"
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none font-bold"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              จำนวนเงินตามข้อมูลปีล่าสุด: ฿{defaultAmount?.toLocaleString() || '0'}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              วันที่ชำระเงินจริง *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-55 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  บันทึกการชำระเงิน
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
