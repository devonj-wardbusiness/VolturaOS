'use client'

export type CustomerTabId = 'overview' | 'history' | 'estimates' | 'invoice'

const TABS: { id: CustomerTabId; icon: string; label: string }[] = [
  { id: 'overview',  icon: '👤', label: 'Info' },
  { id: 'history',   icon: '📍', label: 'History' },
  { id: 'estimates', icon: '📄', label: 'Estimates' },
  { id: 'invoice',   icon: '💲', label: 'Invoice' },
]

interface CustomerSidebarProps {
  activeTab: CustomerTabId
  onTabChange: (tab: CustomerTabId) => void
}

export function CustomerSidebar({ activeTab, onTabChange }: CustomerSidebarProps) {
  return (
    <aside
      className="fixed left-0 z-40 bg-[#0c0f1a] border-r border-white/5 flex flex-col items-center py-2 gap-1 w-[60px] md:w-[72px]"
      style={{ top: 'var(--header-h)', bottom: 'var(--nav-h)' }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            className="w-full flex flex-col items-center gap-0.5 py-3 md:py-4 text-center transition-colors"
            style={{
              background: isActive ? '#1A1F6E' : 'transparent',
              borderLeft: isActive ? '3px solid #C9A227' : '3px solid transparent',
            }}
          >
            <span className="text-lg md:text-xl">{tab.icon}</span>
            <span
              className="text-[9px] md:text-[11px] font-semibold uppercase tracking-wider leading-none"
              style={{ color: isActive ? '#C9A227' : '#3a4060' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </aside>
  )
}
