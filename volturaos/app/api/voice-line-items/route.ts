import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { LineItem } from '@/types'

const client = new Anthropic()

interface SlimEntry {
  id: string
  job_type: string
  price_better: number | null
  category: string
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, pricebook } = await req.json() as {
      transcript: string
      pricebook: SlimEntry[]
    }

    if (!transcript?.trim() || !pricebook?.length) {
      return NextResponse.json({ items: [] })
    }

    const pricebookText = pricebook
      .map((e) => `id:${e.id} | ${e.job_type} | $${e.price_better ?? 0} | ${e.category}`)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a line-item matcher for an electrical contractor's estimate app.

PRICEBOOK (id | job_type | price | category):
${pricebookText}

TECHNICIAN SAID: "${transcript}"

Return a JSON array of matched pricebook items. Only use IDs from the pricebook above — never invent items.
Format: [{"id":"<uuid>","qty":1}, ...]
If nothing matches, return [].
Return ONLY the JSON array, no explanation.`,
        },
      ],
    })

    const text = (message.content[0] as { text: string }).text.trim()
    const matches = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]') as { id: string; qty: number }[]

    const items: LineItem[] = matches
      .map(({ id, qty }) => {
        const entry = pricebook.find((e) => e.id === id)
        if (!entry) return null
        const price = (entry.price_better ?? 0) * (qty ?? 1)
        return {
          description: qty > 1 ? `${entry.job_type} (×${qty})` : entry.job_type,
          price,
          is_override: false,
          original_price: price,
          tier: 'better' as const,
          category: entry.category,
        }
      })
      .filter(Boolean) as LineItem[]

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[voice-line-items]', err)
    return NextResponse.json({ items: [], error: 'Match failed' }, { status: 200 })
  }
}
