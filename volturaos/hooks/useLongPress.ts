// volturaos/hooks/useLongPress.ts
import { useRef } from 'react'

export interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchCancel: (e: React.TouchEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function useLongPress(onLongPress: () => void, delay = 500): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const fired = useRef(false)

  function start(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    fired.current = false
    timerRef.current = setTimeout(() => {
      fired.current = true
      navigator.vibrate?.(40)
      onLongPress()
    }, delay)
  }

  function move(e: React.TouchEvent) {
    const dx = Math.abs(e.touches[0].clientX - startX.current)
    const dy = Math.abs(e.touches[0].clientY - startY.current)
    if (dx > 10 || dy > 10) clear()
  }

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function end(e: React.TouchEvent) {
    clear()
    if (fired.current) e.preventDefault()
  }

  function contextMenu(e: React.MouseEvent) {
    e.preventDefault()
    if (fired.current) return
    navigator.vibrate?.(40)
    onLongPress()
  }

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: clear,
    onContextMenu: contextMenu,
  }
}
