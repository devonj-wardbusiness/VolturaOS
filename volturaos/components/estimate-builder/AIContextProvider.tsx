'use client'

import { createContext } from 'react'
import type { AIPageContext } from '@/types'

export const AIContextContext = createContext<AIPageContext | null>(null)

export function AIContextProvider({ context, children }: { context: AIPageContext; children: React.ReactNode }) {
  return <AIContextContext.Provider value={context}>{children}</AIContextContext.Provider>
}
