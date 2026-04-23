'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ROOM_ISSUES, ROOMS } from './constants'

interface RoomIssueSheetProps {
  roomId: string | null
  flags: Record<string, string[]>
  onChange: (roomId: string, issues: string[]) => void
  onClose: () => void
}

export function RoomIssueSheet({ roomId, flags, onChange, onClose }: RoomIssueSheetProps) {
  if (!roomId) return null
  const id: string = roomId
  const room = ROOMS.find(r => r.id === id)
  const current = flags[id] ?? []
  const availableIssues = ROOM_ISSUES.filter(issue =>
    !issue.rooms || issue.rooms.includes(id)
  )

  function toggle(issueId: string) {
    const next = current.includes(issueId)
      ? current.filter(i => i !== issueId)
      : [...current, issueId]
    onChange(id, next)
  }

  return (
    <BottomSheet open={!!roomId} onClose={onClose} title={`${room?.icon} ${room?.label}`}>
      <div className="space-y-2 pb-4">
        <p className="text-gray-500 text-xs mb-3">Tap any issues found in this room</p>
        {availableIssues.map(issue => {
          const selected = current.includes(issue.id)
          return (
            <button
              key={issue.id}
              onClick={() => toggle(issue.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                selected
                  ? 'bg-orange-900/20 border-orange-500/40 text-orange-400'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                selected ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
              }`}>
                {selected && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">{issue.label}</span>
            </button>
          )
        })}
        {current.length > 0 && (
          <button
            onClick={() => onChange(id, [])}
            className="w-full text-xs text-gray-500 py-2"
          >
            Clear all issues
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
