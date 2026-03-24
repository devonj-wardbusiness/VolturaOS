import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/nav/BottomNav'
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh pb-16">
      {children}
      <BottomNav />
      <AIChatWidget />
    </div>
  )
}
