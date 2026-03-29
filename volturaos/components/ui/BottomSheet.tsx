'use client'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-volturaBlue border-t border-volturaNavy rounded-t-2xl flex flex-col max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="px-5 pt-5 pb-2 shrink-0">
          {title && <h3 className="text-white font-semibold text-lg">{title}</h3>}
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
