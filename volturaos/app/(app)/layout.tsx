export const dynamic = 'force-dynamic'

import { BottomNav } from '@/components/nav/BottomNav'
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth disabled — no login required for now

  return (
    <div className="min-h-dvh pb-16">
      {children}
      <BottomNav />
      <AIChatWidget />
    </div>
  )
}
