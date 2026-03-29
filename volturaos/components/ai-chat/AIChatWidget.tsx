'use client'

import { useState, useRef, useEffect, useContext, useCallback } from 'react'
import type { AIPageContext } from '@/types'
import { AIContextContext } from '@/components/estimate-builder/AIContextProvider'
import { ChatModeTab } from './ChatModeTab'
import { StreamingResponse } from './StreamingResponse'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AIPageContext['mode']>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pageContext = useContext(AIContextContext)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setStreaming(true)

    const context: AIPageContext = pageContext
      ? { ...pageContext, mode }
      : { mode }

    // Capture history before adding the new user message (which was just added above)
    const history = messages.map((m) => ({ role: m.role, content: m.text }))

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context, history }),
      })

      if (!res.ok) {
        const errText = await res.text()
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `[Error: ${errText}]` },
        ])
        setStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '[Error: No response stream]' },
        ])
        setStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let accumulated = ''

      setMessages((prev) => [...prev, { role: 'assistant', text: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', text: accumulated }
          return updated
        })
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '[Error: Could not reach AI service]' },
      ])
    } finally {
      setStreaming(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-volturaGold text-volturaBlue shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform active:scale-95"
        aria-label="Open AI Assistant"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
          <line x1="9" y1="21" x2="15" y2="21"/>
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">VolturaOS AI</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMessages([])}
            className="text-xs text-white/50 hover:text-white/80 px-2 py-1"
          >
            Clear
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white p-1"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <ChatModeTab activeMode={mode} onSelect={setMode} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-white/40 mt-12">
            <p className="text-3xl mb-2">💡</p>
            <p className="text-sm">Ask me anything about estimates, permits, upsells, or electrical work.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-volturaGold text-volturaBlue rounded-br-md'
                  : 'bg-surface text-white rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <StreamingResponse
                  text={msg.text}
                  isStreaming={streaming && i === messages.length - 1}
                />
              ) : (
                <p className="text-sm">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3 pb-safe">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask VolturaOS AI..."
            disabled={streaming}
            className="flex-1 bg-surface text-white rounded-full px-4 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-volturaGold/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="w-10 h-10 rounded-full bg-volturaGold text-volturaBlue flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition-all active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
