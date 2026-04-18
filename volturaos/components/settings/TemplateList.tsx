'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTemplate, renameTemplate } from '@/lib/actions/estimates'
import type { Estimate } from '@/types'

type Template = Pick<Estimate, 'id' | 'name' | 'total' | 'line_items'>

interface TemplateListProps {
  templates: Template[]
}

export function TemplateList({ templates }: TemplateListProps) {
  const router = useRouter()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleDelete(id: string) {
    setBusy(true)
    try {
      await deleteTemplate(id)
      router.refresh()
    } finally {
      setBusy(false)
      setConfirmDeleteId(null)
    }
  }

  function startRename(t: Template) {
    setEditingId(t.id)
    setEditName(t.name ?? '')
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setBusy(true)
    try {
      await renameTemplate(id, editName.trim())
      router.refresh()
    } finally {
      setBusy(false)
      setEditingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {templates.map(t => (
        <div key={t.id} className="bg-volturaNavy rounded-xl p-4">
          {editingId === t.id ? (
            /* Rename mode */
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename(t.id)}
                autoFocus
                className="w-full bg-white/7 text-white rounded-lg px-3 py-2 text-sm outline-none border border-volturaGold/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 py-1.5 rounded-lg text-gray-400 text-xs bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRename(t.id)}
                  disabled={busy || !editName.trim()}
                  className="flex-1 py-1.5 rounded-lg text-volturaBlue text-xs font-bold bg-volturaGold disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : confirmDeleteId === t.id ? (
            /* Delete confirmation mode */
            <div className="space-y-2">
              <p className="text-white text-sm font-semibold">Delete "{t.name}"?</p>
              <p className="text-gray-400 text-xs">This can't be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-1.5 rounded-lg text-gray-400 text-xs bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={busy}
                  className="flex-1 py-1.5 rounded-lg text-white text-xs font-bold bg-red-600 disabled:opacity-50"
                >
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            /* Normal row */
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {(t.line_items as unknown[])?.length ?? 0} items · ${(t.total ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => startRename(t)}
                  className="text-gray-400 text-xs hover:text-volturaGold"
                >
                  Rename
                </button>
                <button
                  onClick={() => setConfirmDeleteId(t.id)}
                  className="text-red-400 text-xs hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
