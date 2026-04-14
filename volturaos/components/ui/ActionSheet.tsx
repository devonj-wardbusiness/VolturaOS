'use client'

import { useState, useEffect } from 'react'

export interface ActionItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}

interface ActionSheetProps {
  label: string
  actions: ActionItem[]
  onClose: () => void
}

export function ActionSheet({ label, actions, onClose }: ActionSheetProps) {
  const [confirmingAction, setConfirmingAction] = useState<ActionItem | null>(null)
  const [visible, setVisible] = useState(false)

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  function handleAction(action: ActionItem) {
    if (action.destructive) {
      setConfirmingAction(action)
      return
    }
    action.onClick()
    close()
  }

  async function confirmDelete() {
    if (!confirmingAction) return
    confirmingAction.onClick()
    close()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0D0F1A] border-t border-white/10 rounded-t-2xl pb-safe"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 220ms ease-out',
        }}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Label */}
        <p className="text-gray-400 text-xs uppercase tracking-wider px-5 pt-2 pb-3 border-b border-white/5 truncate">
          {label}
        </p>

        {confirmingAction ? (
          /* Confirmation view */
          <div className="px-5 py-5 space-y-3">
            <p className="text-white text-sm text-center">
              Delete <span className="font-semibold">{label}</span>? This cannot be undone.
            </p>
            <button
              onClick={confirmDelete}
              className="w-full py-3.5 bg-red-600 active:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmingAction(null)}
              className="w-full py-3 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Actions list */
          <div className="py-2">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                className={`w-full flex items-center gap-4 px-5 py-4 border-b border-white/5 active:bg-white/5 transition-colors text-left ${
                  action.destructive ? 'text-red-400' : 'text-white'
                }`}
              >
                <span className="text-lg leading-none flex-shrink-0">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
            <button
              onClick={close}
              className="w-full py-4 text-gray-500 text-sm font-medium active:bg-white/5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  )
}
