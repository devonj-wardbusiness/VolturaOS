export function SkeletonCard() {
  return (
    <div className="bg-volturaNavy/50 rounded-xl p-4 animate-pulse space-y-3">
      <div className="h-4 bg-volturaNavy rounded w-3/4" />
      <div className="h-3 bg-volturaNavy rounded w-1/2" />
      <div className="h-3 bg-volturaNavy rounded w-1/3" />
    </div>
  )
}
