'use client'

import type { PricebookEntry } from '@/types'

interface JobTypeSelectorProps {
  pricebook: PricebookEntry[]
  selected: string | null
  onSelect: (jobType: string) => void
}

export function JobTypeSelector({ pricebook, selected, onSelect }: JobTypeSelectorProps) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Job Type</label>
      <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto">
        {pricebook.map((p) => (
          <button key={p.id} onClick={() => onSelect(p.job_type)}
            className={`text-left px-4 py-3 rounded-xl text-sm transition-colors ${
              selected === p.job_type ? 'bg-volturaGold text-volturaBlue font-bold' : 'bg-volturaNavy/50 text-white'
            }`}>
            {p.job_type}
          </button>
        ))}
      </div>
    </div>
  )
}
