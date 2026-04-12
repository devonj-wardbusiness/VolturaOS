'use server'

import Anthropic from '@anthropic-ai/sdk'
import type { LineItem } from '@/types'

const client = new Anthropic()

export async function generateMaterialList(lineItems: LineItem[]): Promise<string> {
  if (!lineItems.length) return 'No line items on this estimate yet.'

  const itemsText = lineItems
    .map((li) => `- ${li.description} ($${li.price})`)
    .join('\n')

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content:
          `You are a master electrician generating a material takeoff list for a job. ` +
          `Based on the following estimate line items, list the specific materials needed. ` +
          `Format as a plain shopping list grouped by category (Wire & Cable, Breakers & Protection, ` +
          `Devices & Boxes, Conduit & Fittings, Misc Hardware). ` +
          `Be specific — include wire gauges, breaker amperage, conduit sizes. ` +
          `Add a quantity estimate where obvious. Keep it tight — this is a field list.\n\n` +
          `Estimate line items:\n${itemsText}\n\n` +
          `Return the material list only — no preamble, no explanation.`,
      },
    ],
  })

  const block = msg.content[0]
  return block.type === 'text' ? block.text : 'Could not generate list.'
}

export async function generateUpsellSuggestion(
  lineItems: LineItem[],
  jobType: string
): Promise<{ name: string; reason: string; price: number } | null> {
  if (!lineItems.length) return null

  const itemsText = lineItems.map((li) => li.description).join(', ')

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content:
          `You are an expert electrical sales assistant. A customer is about to sign an estimate ` +
          `for: ${jobType}. Current line items: ${itemsText}.\n\n` +
          `Suggest ONE single high-value add-on they would genuinely benefit from — ` +
          `something not already covered, safety or convenience focused, easy to add today. ` +
          `NEC 2023 code upgrades (surge protection, AFCI, GFCI) are great suggestions if missing.\n\n` +
          `Respond with JSON only: {"name": "...", "reason": "...(1 sentence, customer-facing)", "price": 000}\n` +
          `Price should be a realistic mid-tier number. No markdown, no explanation.`,
      },
    ],
  })

  try {
    const block = msg.content[0]
    if (block.type !== 'text') return null
    const raw = block.text.match(/\{[\s\S]*\}/)
    if (!raw) return null
    return JSON.parse(raw[0]) as { name: string; reason: string; price: number }
  } catch {
    return null
  }
}

export async function cleanupVoiceNotes(rawTranscript: string, jobType: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content:
          `You are a field electrician's assistant. Clean up and structure this raw voice transcript ` +
          `from a job site note. Job type: ${jobType}.\n\n` +
          `Raw transcript: "${rawTranscript}"\n\n` +
          `Rules: Fix grammar and punctuation. Keep all technical details exact (wire gauges, breaker sizes, ` +
          `part numbers, locations). Format as short bullet points if multiple items mentioned. ` +
          `Use electrician terminology. Do not add anything not in the transcript. ` +
          `Return the cleaned note only — no preamble.`,
      },
    ],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text.trim() : rawTranscript
}

export async function analyzePhotoForEstimate(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<{ description: string; price: number; category: string }[]> {
  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text:
              `You are an expert electrician reviewing a photo from a job site. ` +
              `Identify the electrical components, issues, or work needed and suggest ` +
              `estimate line items for Voltura Power Group (Colorado Springs electrical contractor).\n\n` +
              `Look for: panel brand/condition, breaker issues, double-taps, missing AFCI/GFCI, ` +
              `wiring issues, code violations, meter condition, grounding, service size, etc.\n\n` +
              `Return JSON array only:\n` +
              `[{"description": "...", "price": 000, "category": "..."}]\n\n` +
              `Use realistic mid-tier Colorado Springs pricing. Category options: ` +
              `"Panel Upgrades", "Code Compliance", "Circuits", "Service Calls", "EV Chargers". ` +
              `Max 6 items. No markdown, no explanation — JSON array only.`,
          },
        ],
      },
    ],
  })

  try {
    const block = msg.content[0]
    if (block.type !== 'text') return []
    const raw = block.text.match(/\[[\s\S]*\]/)
    if (!raw) return []
    return JSON.parse(raw[0]) as { description: string; price: number; category: string }[]
  } catch {
    return []
  }
}

export async function generateNeighborhoodBlitzMessage(
  jobType: string,
  zip: string
): Promise<string> {
  return (
    `Hi! Voltura Power Group just finished a ${jobType} job in your neighborhood (${zip}). ` +
    `If you've been thinking about electrical work — panel upgrade, EV charger, new circuits, ` +
    `or a safety inspection — we're already in the area and have openings this week. ` +
    `Call or text us at ${process.env.VOLTURA_PHONE ?? '(719) 555-0100'} for a free estimate.`
  )
}
