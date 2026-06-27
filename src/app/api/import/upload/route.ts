import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createImportBatch, saveImportImages } from '@/lib/import/import-service'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const TEXT_TYPES = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel', '']

export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const sourceCompany = formData.get('sourceCompany') as 'AXA' | 'AIA'

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    if (!sourceCompany || (sourceCompany !== 'AXA' && sourceCompany !== 'AIA')) {
      return NextResponse.json({ error: 'Invalid source company' }, { status: 400 })
    }

    // 3. Detect file mode: 'image' or 'text'
    // All files in a batch must be the same mode
    const firstFile = files[0]
    const firstMime = firstFile.type.toLowerCase()
    const isTextMode =
      firstFile.name.endsWith('.csv') ||
      firstFile.name.endsWith('.txt') ||
      TEXT_TYPES.includes(firstMime)

    // 4. Create Import Batch (reuse the same table, tag mode in notes)
    const batch = (await createImportBatch(supabase, user.id, sourceCompany, files.length)) as any

    // 5. Handle files based on mode
    const imageUrls: string[] = []

    if (isTextMode) {
      // Text/CSV mode: store the text content as a data URL or plain text reference
      for (const file of files) {
        const text = await file.text()
        // Encode as a data URI so it fits the same image_url pipeline without extra DB columns
        const dataUri = `data:text/plain;charset=utf-8;filename=${encodeURIComponent(file.name)},${encodeURIComponent(text)}`
        imageUrls.push(dataUri)
      }
    } else {
      // Image mode: upload to Supabase Storage (original behavior)
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const filename = `${crypto.randomUUID()}.${fileExt}`
        const storagePath = `${user.id}/${batch.id}/${filename}`

        const { data: storageData, error: storageErr } = await supabase.storage
          .from('ocr-imports')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: true,
          })

        if (storageErr) {
          console.warn('Supabase storage upload failed, saving file locally as fallback:', storageErr.message)
          try {
            const fs = await import('fs/promises')
            const path = await import('path')
            const localDir = path.join(process.cwd(), 'public', 'uploads', user.id, batch.id)
            await fs.mkdir(localDir, { recursive: true })

            const fileBuffer = Buffer.from(await file.arrayBuffer())
            const filePath = path.join(localDir, file.name)
            await fs.writeFile(filePath, fileBuffer)
          } catch (localWriteErr) {
            console.error('Failed to write file locally:', localWriteErr)
          }

          const mockUrl = `/uploads/${user.id}/${batch.id}/${file.name}`
          imageUrls.push(mockUrl)
        } else {
          const { data: urlData } = supabase.storage
            .from('ocr-imports')
            .getPublicUrl(storagePath)

          imageUrls.push(urlData.publicUrl)
        }
      }
    }

    // 6. Save Import Images (image_url stores either a real URL or the text data URI)
    const savedImages = (await saveImportImages(supabase, user.id, batch.id, imageUrls, sourceCompany)) as any[]

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      sourceCompany,
      mode: isTextMode ? 'text' : 'image',
      images: savedImages.map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
      })),
    })
  } catch (error: any) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
