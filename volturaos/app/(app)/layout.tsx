export const dynamic = 'force-dynamic'

import { BottomNav } from '@/components/nav/BottomNav'
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'
import { FAB } from '@/components/ui/FAB'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-16">
      {children}
      <BottomNav />
      <AIChatWidget />
      <FAB />
    </div>
  )
}
