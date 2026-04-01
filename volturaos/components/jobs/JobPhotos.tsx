'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadJobPhoto, deleteJobPhoto } from '@/lib/actions/job-photos'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

export function JobPhotos({ jobId, initialPhotos }: { jobId: string; initialPhotos: JobPhotoRecord[] }) {
  const [photos, setPhotos] = useState<JobPhotoRecord[]>(initialPhotos)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.append('photo', file)
    // Optimistic preview
    const previewUrl = URL.createObjectURL(file)
    const tempPhoto: JobPhotoRecord = {
      id: 'tmp-' + Date.now(),
      job_id: jobId,
      storage_path: '',
      caption: null,
      uploaded_at: new Date().toISOString(),
      url: previewUrl,
    }
    setPhotos(p => [tempPhoto, ...p])
    startTransition(async () => {
      try {
        await uploadJobPhoto(jobId, fd)
        // Remove temp, server revalidation will refresh with real data on next load
        setPhotos(p => p.filter(x => x.id !== tempPhoto.id))
      } catch {
        setPhotos(p => p.filter(x => x.id !== tempPhoto.id))
        setError('Upload failed. Please try again.')
      }
    })
    e.target.value = ''
  }

  function handleDelete(photo: JobPhotoRecord) {
    if (photo.storage_path === '') return // temp photo
    startTransition(async () => {
      try {
        await deleteJobPhoto(photo.id, photo.storage_path, jobId)
        setPhotos(p => p.filter(x => x.id !== photo.id))
      } catch {
        setError('Delete failed. Please try again.')
      }
    })
  }

  return (
    <div className="bg-volturaNavy/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Site Photos</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-volturaGold text-xs font-semibold disabled:opacity-50"
        >
          {isPending ? 'Uploading...' : '+ Add Photo'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      {photos.length === 0 ? (
        <p className="text-gray-600 text-sm">No photos yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square">
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover rounded-lg cursor-pointer"
                onClick={() => setLightbox(photo.url ?? null)}
              />
              {photo.storage_path !== '' && (
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}
    </div>
  )
}
