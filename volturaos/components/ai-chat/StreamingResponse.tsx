'use client'

export function StreamingResponse({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  if (!text && !isStreaming) return null

  const lines = text.split('\n')

  return (
    <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <p key={i} className="font-bold text-base mt-2 mb-1">{line.slice(2)}</p>
        }
        if (line.startsWith('## ')) {
          return <p key={i} className="font-semibold mt-2 mb-1">{line.slice(3)}</p>
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <p key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-volturaGold">{line.slice(2)}</p>
        }
        if (line.startsWith('[Error:')) {
          return <p key={i} className="text-red-400 mt-2">{line}</p>
        }
        if (line.trim() === '') {
          return <br key={i} />
        }
        const formatted = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      })}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-volturaGold animate-pulse ml-0.5" />
      )}
    </div>
  )
}
