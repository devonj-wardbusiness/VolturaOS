'use client'

interface ScoreRingProps {
  score: number
}

export function ScoreRing({ score }: ScoreRingProps) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="58" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">{score}</text>
        <text x="64" y="78" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="sans-serif">{grade}</text>
      </svg>
      <p className="text-gray-400 text-xs">Electrical Health Score</p>
    </div>
  )
}
