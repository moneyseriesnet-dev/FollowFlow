import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createImportBatch, saveImportImages } from '@/lib/import/import-service'

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

    // 3. Create Import Batch
    const batch = (await createImportBatch(supabase, user.id, sourceCompany, files.length)) as any

    // 4. Upload files and collect URLs
    const imageUrls: string[] = []
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const filename = `${crypto.randomUUID()}.${fileExt}`
      const storagePath = `${user.id}/${batch.id}/${filename}`

      // Upload file to Supabase Storage 'ocr-imports' bucket
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
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('ocr-imports')
          .getPublicUrl(storagePath)
        
        imageUrls.push(urlData.publicUrl)
      }
    }

    // 5. Save Import Images
    const savedImages = (await saveImportImages(supabase, user.id, batch.id, imageUrls, sourceCompany)) as any[]

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      sourceCompany,
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
