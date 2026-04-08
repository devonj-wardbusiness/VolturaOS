export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { BottomNav } from '@/components/nav/BottomNav'
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'
import { FAB } from '@/components/ui/FAB'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-16">
      <Link
        href="/search"
        className="fixed top-3 right-16 z-60 text-gray-400 hover:text-volturaGold p-1"
        aria-label="Search"
      >
        <Search size={20} />
      </Link>
      {children}
      <BottomNav />
      <AIChatWidget />
      <FAB />
    </div>
  )
}
