'use client'

import { useState } from 'react'
import type { WizardState } from './types'
import { ROOMS } from './constants'
import { RoomIssueSheet } from './RoomIssueSheet'

interface RoomsStepProps {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

export function RoomsStep({ state, onChange, onNext, onBack }: RoomsStepProps) {
  const [openRoom, setOpenRoom] = useState<string | null>(null)

  function handleRoomIssues(roomId: string, issues: string[]) {
    const next = { ...state.roomFlags }
    if (issues.length === 0) {
      delete next[roomId]
    } else {
      next[roomId] = issues
    }
    onChange({ roomFlags: next })
  }

  const flaggedCount = Object.keys(state.roomFlags).length

  return (
    <div className="flex flex-col flex-1">
      <p className="text-gray-500 text-xs mb-3">Tap any room to flag issues found during walkthrough</p>

      <div className="flex-1 grid grid-cols-2 gap-2 content-start pb-4">
        {ROOMS.map(room => {
          const issues = state.roomFlags[room.id] ?? []
          const flagged = issues.length > 0
          return (
            <button
              key={room.id}
              onClick={() => setOpenRoom(room.id)}
              className={`rounded-xl p-3 text-left border transition-colors ${
                flagged
                  ? 'bg-orange-900/20 border-orange-500/40'
                  : 'bg-volturaNavy/30 border-white/5'
              }`}
            >
              <span className="text-2xl block mb-1">{room.icon}</span>
              <p className={`text-xs font-semibold ${flagged ? 'text-orange-400' : 'text-white'}`}>
                {room.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {flagged ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'No issues'}
              </p>
            </button>
          )
        })}
      </div>

      {flaggedCount > 0 && (
        <p className="text-orange-400 text-xs text-center mb-2">{flaggedCount} room{flaggedCount > 1 ? 's' : ''} flagged</p>
      )}

      <div className="flex gap-2 mt-2">
        <button onClick={onBack} className="px-4 py-3.5 rounded-xl text-sm text-gray-400 border border-white/10">← Back</button>
        <button onClick={onNext} className="flex-1 bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm">
          Calculate Score →
        </button>
      </div>

      <RoomIssueSheet
        roomId={openRoom}
        flags={state.roomFlags}
        onChange={handleRoomIssues}
        onClose={() => setOpenRoom(null)}
      />
    </div>
  )
}
