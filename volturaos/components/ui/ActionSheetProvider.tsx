'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ActionSheet, ActionItem } from './ActionSheet'

interface SheetState {
  label: string
  actions: ActionItem[]
}

interface ActionSheetContextValue {
  openSheet: (label: string, actions: ActionItem[]) => void
}

const ActionSheetContext = createContext<ActionSheetContextValue>({
  openSheet: () => {},
})

export function useActionSheet() {
  return useContext(ActionSheetContext)
}

export function ActionSheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState | null>(null)

  const openSheet = useCallback((label: string, actions: ActionItem[]) => {
    setSheet({ label, actions })
  }, [])

  const closeSheet = useCallback(() => {
    setSheet(null)
  }, [])

  return (
    <ActionSheetContext.Provider value={{ openSheet }}>
      {children}
      {sheet && typeof document !== 'undefined' &&
        createPortal(
          <ActionSheet label={sheet.label} actions={sheet.actions} onClose={closeSheet} />,
          document.body
        )
      }
    </ActionSheetContext.Provider>
  )
}
