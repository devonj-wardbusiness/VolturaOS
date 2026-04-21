'use client'

type TabId = 'job' | 'history' | 'estimates' | 'invoice' | 'forms'

interface Tab {
  id: TabId
  icon: string
  label: string
  disabled?: boolean
}

const TABS: Tab[] = [
  { id: 'job',       icon: '🔧', label: 'Job' },
  { id: 'history',   icon: '📍', label: 'History' },
  { id: 'estimates', icon: '📄', label: 'Estimates' },
  { id: 'invoice',   icon: '💲', label: 'Invoice' },
  { id: 'forms',     icon: '📋', label: 'Forms', disabled: true },
]

interface ProfileSidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function ProfileSidebar({ activeTab, onTabChange }: ProfileSidebarProps) {
  return (
    <aside className="fixed top-14 bottom-16 left-0 w-[60px] bg-[#0c0f1a] border-r border-white/5 z-40 flex flex-col items-center py-2 gap-1">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? 'Coming soon' : tab.label}
            className="w-full flex flex-col items-center gap-0.5 py-3 text-center transition-colors"
            style={{
              background: isActive ? '#1A1F6E' : 'transparent',
              borderLeft: isActive ? '3px solid #C9A227' : '3px solid transparent',
              opacity: tab.disabled ? 0.35 : 1,
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <span className="text-base">{tab.icon}</span>
            <span
              className="text-[9px] font-semibold uppercase tracking-wider leading-none"
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

export type { TabId }
