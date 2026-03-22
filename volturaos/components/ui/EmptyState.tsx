import Link from 'next/link'

interface EmptyStateProps {
  message: string
  ctaLabel: string
  ctaHref: string
}

export function EmptyState({ message, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">⚡</span>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      <Link href={ctaHref} className="bg-volturaGold text-volturaBlue font-bold px-6 py-2.5 rounded-xl text-sm">
        {ctaLabel}
      </Link>
    </div>
  )
}
