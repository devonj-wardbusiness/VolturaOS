'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SmsThread, SmsMessage } from '@/lib/actions/messages'
import { replySms } from '@/lib/actions/messages'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ConversationProps {
  thread: SmsThread
  onBack: () => void
}

function Conversation({ thread, onBack }: ConversationProps) {
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [sending, startTransition] = useTransition()
  const [messages, setMessages] = useState<SmsMessage[]>(thread.messages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const body = reply.trim()
    if (!body || sending) return
    setReply('')
    // Optimistic update
    const optimistic: SmsMessage = {
      id: crypto.randomUUID(),
      customer_id: thread.customer_id,
      direction: 'outbound',
      body,
      phone: thread.phone,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    startTransition(async () => {
      await replySms(thread.phone, body, thread.customer_id)
      router.refresh()
    })
  }

  const displayName = thread.customer_name ?? thread.phone

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={onBack} className="text-volturaGold text-lg">‹</button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{displayName}</p>
          <p className="text-gray-500 text-xs">{thread.phone}</p>
        </div>
        {thread.customer_id && (
          <a
            href={`/customers/${thread.customer_id}`}
            className="text-volturaGold text-xs border border-volturaGold/30 px-2 py-1 rounded-lg"
          >
            Profile
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                msg.direction === 'outbound'
                  ? 'bg-volturaGold text-volturaBlue font-medium rounded-br-sm'
                  : 'bg-volturaNavy text-white rounded-bl-sm'
              }`}
            >
              <p>{msg.body}</p>
              <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-volturaBlue/60' : 'text-gray-500'}`}>
                {timeAgo(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-white/10 shrink-0 pb-safe">
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Reply…"
          rows={1}
          className="flex-1 bg-volturaNavy text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold resize-none placeholder-gray-600"
        />
        <button
          onClick={handleSend}
          disabled={!reply.trim() || sending}
          className="bg-volturaGold text-volturaBlue w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

interface MessageInboxProps {
  threads: SmsThread[]
}

export function MessageInbox({ threads }: MessageInboxProps) {
  const [selected, setSelected] = useState<SmsThread | null>(null)

  if (selected) {
    return (
      <div className="h-[calc(100dvh-var(--header-h)-var(--nav-h))]">
        <Conversation thread={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 'var(--header-h)' }}>
      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-white font-semibold">No messages yet</p>
          <p className="text-gray-500 text-sm mt-1">Inbound texts from customers will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {threads.map(thread => (
            <button
              key={thread.phone}
              onClick={() => setSelected(thread)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left active:bg-white/5"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-volturaNavy flex items-center justify-center text-volturaGold font-bold text-sm shrink-0">
                {(thread.customer_name ?? thread.phone)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <p className="text-white font-semibold text-sm truncate">
                    {thread.customer_name ?? thread.phone}
                  </p>
                  <p className="text-gray-500 text-xs shrink-0 ml-2">{timeAgo(thread.last_at)}</p>
                </div>
                <p className={`text-xs mt-0.5 truncate ${thread.unread ? 'text-white' : 'text-gray-500'}`}>
                  {thread.last_message}
                </p>
              </div>
              {thread.unread && (
                <div className="w-2 h-2 rounded-full bg-volturaGold mt-1.5 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
