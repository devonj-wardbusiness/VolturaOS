interface SparklineChartProps {
  data: { date: string; amount: number }[]
}

export function SparklineChart({ data }: SparklineChartProps) {
  if (data.every(d => d.amount === 0)) return null

  const values = data.map(d => d.amount)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 32 - ((v - min) / range) * 28
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width="100%"
      height="32"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className="mt-2"
    >
      <polyline
        points={points}
        stroke="#D4AF37"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
