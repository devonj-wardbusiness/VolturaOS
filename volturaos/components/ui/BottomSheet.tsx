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
      <div className="absolute bottom-0 left-0 right-0 bg-volturaBlue border-t border-volturaNavy rounded-t-2xl p-5 pb-8 animate-slide-up">
        {title && <h3 className="text-white font-semibold text-lg mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
