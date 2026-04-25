'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full bg-volturaNavy rounded-xl py-3 text-white text-sm font-semibold active:opacity-70 flex items-center justify-center gap-2"
    >
      🖨️ Save / Print Copy
    </button>
  )
}
