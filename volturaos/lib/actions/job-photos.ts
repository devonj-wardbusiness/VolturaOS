'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface JobPhotoRecord {
  id: string
  job_id: string
  storage_path: string
  caption: string | null
  uploaded_at: string
  url?: string
}

export async function getJobPhotos(jobId: string): Promise<JobPhotoRecord[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('uploaded_at', { ascending: false })
  if (error) throw new Error(error.message)
  const photos = (data ?? []) as JobPhotoRecord[]
  const withUrls = await Promise.all(
    photos.map(async (p) => {
      const { data: signed } = await admin.storage
        .from('job-photos')
        .createSignedUrl(p.storage_path, 3600)
      return { ...p, url: signed?.signedUrl ?? '' }
    })
  )
  return withUrls
}

export async function uploadJobPhoto(jobId: string, formData: FormData): Promise<void> {
  const admin = createAdminClient()
  const file = formData.get('photo') as File
  if (!file || file.size === 0) throw new Error('No file')
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${jobId}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: upErr } = await admin.storage
    .from('job-photos')
    .upload(path, bytes, { contentType: file.type })
  if (upErr) throw new Error(upErr.message)
  const { error: dbErr } = await admin.from('job_photos').insert({
    job_id: jobId,
    storage_path: path,
  })
  if (dbErr) {
    await admin.storage.from('job-photos').remove([path])
    throw new Error(dbErr.message)
  }
  revalidatePath(`/jobs/${jobId}`)
}

export async function deleteJobPhoto(photoId: string, storagePath: string, jobId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.storage.from('job-photos').remove([storagePath])
  await admin.from('job_photos').delete().eq('id', photoId)
  revalidatePath(`/jobs/${jobId}`)
}
