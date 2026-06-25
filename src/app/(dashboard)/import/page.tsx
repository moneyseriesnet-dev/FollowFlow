'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Edit3,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Plus
} from 'lucide-react'
import { DraftRow, ImportStep } from '@/lib/ocr/types'

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<ImportStep>('upload')
  const [sourceCompany, setSourceCompany] = useState<'AXA' | 'AIA' | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; imageUrl: string }>>([])
  const [draftRows, setDraftRows] = useState<DraftRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{
    customersCreated: number
    customersMatched: number
    policiesCreated: number
    policiesUpdated: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Warn user before refreshing if in processing/review step
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === 'processing' || step === 'review' || step === 'importing') {
        const message = 'หากคุณ Refresh หน้าเพจตอนนี้ ข้อมูล OCR ที่กำลังดำเนินการหรือกำลังตรวจสอบจะหายไปทั้งหมด'
        e.returnValue = message
        return message
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [step])

  // Handlers for Upload Step
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
      
      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file))
      setPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    URL.revokeObjectURL(previews[index])
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const startUploadAndOcr = async () => {
    if (files.length === 0 || !sourceCompany) return
    setError(null)
    setIsProcessing(true)
    setStep('processing')

    try {
      // 1. Upload files
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      formData.append('sourceCompany', sourceCompany)

      const uploadRes = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const errData = await uploadRes.json()
        throw new Error(errData.error || 'Failed to upload images')
      }

      const uploadData = await uploadRes.json()
      setBatchId(uploadData.batchId)
      setUploadedImages(uploadData.images)

      // 2. Trigger OCR Processing
      const processRes = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: uploadData.batchId,
          images: uploadData.images,
        }),
      })

      if (!processRes.ok) {
        const errData = await processRes.json()
        throw new Error(errData.error || 'Failed to process images')
      }

      const processData = await processRes.json()
      setDraftRows(processData.draftRows)
      setStep('review')
    } catch (err: any) {
      setError(err.message || 'An error occurred during import.')
      setStep('upload')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handlers for Review Step
  const handleEditChange = (id: string, field: keyof DraftRow, value: any) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const toggleEditMode = (id: string) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, isEditing: !row.isEditing } : row))
    )
  }

  const handleRowStatus = (id: string, status: 'approved' | 'rejected') => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, review_status: status } : row))
    )
  }

  const approveAll = () => {
    setDraftRows((prev) => prev.map((row) => ({ ...row, review_status: 'approved' })))
  }

  const rejectAll = () => {
    setDraftRows((prev) => prev.map((row) => ({ ...row, review_status: 'rejected' })))
  }

  const startImport = async () => {
    const approved = draftRows.filter((r) => r.review_status === 'approved' || r.review_status === 'edited')
    if (approved.length === 0) {
      setError('Please approve at least one row before importing.')
      return
    }

    setIsProcessing(true)
    setStep('importing')

    try {
      const res = await fetch('/api/import/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          approvedRows: approved,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Import failed')
      }

      const data = await res.json()
      setImportResults(data.results)
      setStep('complete')
    } catch (err: any) {
      setError(err.message || 'Failed to complete import.')
      setStep('review')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setStep('upload')
    setSourceCompany(null)
    setFiles([])
    setPreviews([])
    setBatchId(null)
    setUploadedImages([])
    setDraftRows([])
    setImportResults(null)
    setError(null)
  }

  const getConfidenceBadgeColor = (score: number | null) => {
    if (!score) return 'bg-slate-100 text-slate-700'
    if (score >= 0.9) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 0.75) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Step Progress Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {['Upload', 'Process', 'Review', 'Done'].map((stepLabel, idx) => {
            const stepKeys: ImportStep[] = ['upload', 'processing', 'review', 'complete']
            const isActive = step === stepKeys[idx] || (step === 'importing' && idx === 2)
            const isCompleted = stepKeys.indexOf(step) > idx

            return (
              <div key={stepLabel} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={`hidden sm:inline text-xs font-semibold ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500'
                  }`}
                >
                  {stepLabel}
                </span>
                {idx < 3 && <div className="hidden sm:block h-[1px] w-8 bg-slate-200 dark:bg-slate-800 mx-2" />}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-indigo-500" />
              Upload Screenshots (อัปโหลดภาพหน้าจอข้อมูลลูกค้า)
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 transition-all group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Click to upload screenshots
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG or JPEG up to 10MB</p>
              </div>
            </div>

            {previews.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Selected Files ({files.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-sm bg-slate-100">
                      <img src={preview} alt="preview" className="object-cover w-full h-full" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Select Source Company (บริษัทประกัน)
                </h3>
                <p className="text-xs text-slate-500 mt-1">Specify which format matches the screenshots.</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setSourceCompany('AXA')}
                  className={`flex w-full items-center justify-between p-4 rounded-2xl border transition-all ${
                    sourceCompany === 'AXA'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-bold'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base tracking-wide">AXA Insurance</span>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${sourceCompany === 'AXA' ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'}`}>
                    {sourceCompany === 'AXA' && <Check className="h-3 w-3" />}
                  </div>
                </button>

                <button
                  onClick={() => setSourceCompany('AIA')}
                  className={`flex w-full items-center justify-between p-4 rounded-2xl border transition-all ${
                    sourceCompany === 'AIA'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-bold'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base tracking-wide">AIA Insurance</span>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${sourceCompany === 'AIA' ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>
                    {sourceCompany === 'AIA' && <Check className="h-3 w-3" />}
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={startUploadAndOcr}
              disabled={files.length === 0 || !sourceCompany}
              className="w-full mt-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 py-4 px-6 rounded-2xl font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              Start OCR Processing
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === 'processing' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 shadow-sm text-center max-w-xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analyze screenshot</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              ระบบกำลังประมวลผลข้อมูลด้วย AI OCR เพื่อดึงชื่อลูกค้า เลขกรมธรรม์ แผนประกัน กำหนดชำระเบี้ย และวันครบกำหนดจากไฟล์ของคุณ ขั้นตอนนี้อาจใช้เวลาสักครู่
            </p>
            <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold mt-2 animate-pulse">
              ⚠️ ห้ามปิดหน้านี้หรือรีเฟรช (Refresh) หน้าเว็บในขณะที่ระบบกำลังประมวลผล
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-[60%] animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Review Extracted Draft Rows (ตรวจสอบและแก้ไขดราฟต์ข้อมูล)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ensure the values extracted by OCR are correct before adding them to the CRM.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={approveAll}
                  className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Check className="h-4 w-4" /> Approve All
                </button>
                <button
                  onClick={rejectAll}
                  className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  <X className="h-4 w-4" /> Reject All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Policy #</th>
                    <th className="p-4">Plan Name</th>
                    <th className="p-4">Premium (THB)</th>
                    <th className="p-4">Freq</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">AI Comment / ข้อสังเกต</th>
                    <th className="p-4">Conf.</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {draftRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${
                        row.ai_comment
                          ? 'bg-amber-50/20 dark:bg-amber-950/10 border-l-2 border-l-amber-500'
                          : ''
                      }`}
                    >
                      {row.isEditing ? (
                        <>
                          <td className="p-3">
                            <input
                              type="text"
                              value={row.detected_customer_name || ''}
                              onChange={(e) => handleEditChange(row.id, 'detected_customer_name', e.target.value)}
                              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={row.detected_policy_number || ''}
                              onChange={(e) => handleEditChange(row.id, 'detected_policy_number', e.target.value)}
                              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={row.detected_plan_name || ''}
                              onChange={(e) => handleEditChange(row.id, 'detected_plan_name', e.target.value)}
                              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={row.detected_premium_amount || ''}
                              onChange={(e) => handleEditChange(row.id, 'detected_premium_amount', Number(e.target.value))}
                              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={row.detected_payment_frequency || 'monthly'}
                              onChange={(e) => handleEditChange(row.id, 'detected_payment_frequency', e.target.value)}
                              className="p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            >
                              <option value="monthly">monthly</option>
                              <option value="quarterly">quarterly</option>
                              <option value="semi_annual">semi_annual</option>
                              <option value="annual">annual</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={row.detected_due_date || ''}
                              onChange={(e) => handleEditChange(row.id, 'detected_due_date', e.target.value)}
                              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={row.ai_comment || ''}
                              onChange={(e) => handleEditChange(row.id, 'ai_comment', e.target.value)}
                              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                              placeholder="ข้อควรระวัง..."
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                            {row.detected_customer_name}
                          </td>
                          <td className="p-4 font-mono">{row.detected_policy_number}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{row.detected_plan_name}</td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                            ฿{row.detected_premium_amount?.toLocaleString()}
                          </td>
                          <td className="p-4 text-slate-500">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px]">
                              {row.detected_payment_frequency}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                            {row.detected_due_date}
                          </td>
                          <td className="p-4 max-w-[220px] truncate" title={row.ai_comment || ''}>
                            {row.ai_comment ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                {row.ai_comment}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${getConfidenceBadgeColor(row.confidence_score)}`}>
                          {(row.confidence_score! * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                            row.review_status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.review_status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {row.review_status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => toggleEditMode(row.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:text-indigo-600"
                            title="Edit fields"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {row.review_status !== 'approved' && (
                            <button
                              onClick={() => handleRowStatus(row.id, 'approved')}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              title="Approve row"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {row.review_status !== 'rejected' && (
                            <button
                              onClick={() => handleRowStatus(row.id, 'rejected')}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                              title="Reject row"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dynamic AI Warnings Summary Card */}
            {draftRows.some((row) => row.ai_comment) && (
              <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>สรุปข้อมูลที่ AI ตรวจพบความผิดปกติหรือต้องการการตรวจสอบเพิ่มเติม (AI Warnings Summary):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 ml-1">
                  {draftRows
                    .filter((row) => row.ai_comment)
                    .map((row) => {
                      const rowNum = draftRows.indexOf(row) + 1;
                      return (
                        <li key={row.id}>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            แถวที่ {rowNum} ({row.detected_customer_name || 'ไม่ทราบชื่อ'}):
                          </span>{' '}
                          <span className="text-amber-700 dark:text-amber-400">
                            {row.ai_comment}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">
                Showing {draftRows.length} extracted items ({draftRows.filter((r) => r.review_status === 'approved').length} approved)
              </span>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={resetWizard}
                  className="flex items-center gap-1.5 px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Start Over
                </button>
                <button
                  onClick={startImport}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Import Approved Rows
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING */}
      {step === 'importing' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 shadow-sm text-center max-w-xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 animate-pulse">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Importing into database...</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Writing policies, setting up customer relationships, and scheduling reminders. This takes just a moment.
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: COMPLETE */}
      {step === 'complete' && importResults && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center max-w-2xl mx-auto space-y-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border-4 border-emerald-100">
              <Check className="h-8 w-8" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Import Successful!</h2>
            <p className="text-sm text-slate-500">
              Screenshots parsed and synchronized with your customer database database.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 border rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Customers Created</span>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{importResults.customersCreated}</p>
            </div>
            <div className="p-4 border rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Customers Matched</span>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{importResults.customersMatched}</p>
            </div>
            <div className="p-4 border rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Policies Created</span>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{importResults.policiesCreated}</p>
            </div>
            <div className="p-4 border rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Policies Updated</span>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{importResults.policiesUpdated}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={resetWizard}
              className="flex items-center gap-1.5 px-6 py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Import More
            </button>
            <button
              onClick={() => router.push('/customers')}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              Go to Customers
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
