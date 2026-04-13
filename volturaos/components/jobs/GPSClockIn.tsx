'use client'

import { useEffect, useState, useTransition } from 'react'
import { clockIn } from '@/lib/actions/jobs'
import { useRouter } from 'next/navigation'

const THRESHOLD_KM = 0.5  // 0.5 km ≈ 0.3 miles

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface GPSClockInProps {
  jobId: string
  address: string | null
  isAlreadyClockedIn: boolean
}

export function GPSClockIn({ jobId, address, isAlreadyClockedIn }: GPSClockInProps) {
  const router = useRouter()
  const [nearby, setNearby] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!address || isAlreadyClockedIn || dismissed) return
    if (!navigator.geolocation) return

    // Only run once per mount
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const query = encodeURIComponent(address)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const json = await res.json() as { lat: string; lon: string }[]
          if (!json.length) return
          const { lat, lon } = json[0]
          const dist = haversineKm(pos.coords.latitude, pos.coords.longitude, parseFloat(lat), parseFloat(lon))
          if (dist <= THRESHOLD_KM) setNearby(true)
        } catch {
          // silently ignore geocoding errors
        }
      },
      () => { /* permission denied or unavailable */ },
      { timeout: 8000 }
    )
  }, [address, isAlreadyClockedIn, dismissed])

  if (!nearby || dismissed) return null

  function handleClockIn() {
    startTransition(async () => {
      await clockIn(jobId)
      setDismissed(true)
      router.refresh()
    })
  }

  return (
    <div className="bg-green-900/20 border border-green-500/30 rounded-2xl px-4 py-4 flex items-start gap-3">
      <span className="text-green-400 text-xl mt-0.5">📍</span>
      <div className="flex-1 min-w-0">
        <p className="text-green-400 font-semibold text-sm">You&apos;re at the job site!</p>
        <p className="text-gray-400 text-xs mt-0.5">Within 0.3 miles of {address}</p>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button
          onClick={handleClockIn}
          disabled={isPending}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
        >
          {isPending ? '…' : 'Clock In'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-600 text-xs text-center"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
