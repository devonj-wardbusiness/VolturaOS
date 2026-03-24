import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompts'
import { AI_TOOLS, executeTool } from '@/lib/ai/tools'
import type { AIPageContext } from '@/types'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { message, context } = (await request.json()) as {
    message: string
    context: AIPageContext
  }

  if (!message?.trim()) {
    return new Response('Message required', { status: 400 })
  }

  const userPrompt = buildUserPrompt(context, message)
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }]

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        let iterations = 0
        const MAX_ITERATIONS = 5

        while (iterations < MAX_ITERATIONS) {
          iterations++

          const stream = client.messages.stream({
            model: 'claude-haiku-4-5',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: AI_TOOLS,
            messages,
          })

          // Collect text deltas and the final message
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }

          const finalMessage = await stream.finalMessage()

          // If Claude is done talking (no tool calls), we're finished
          if (finalMessage.stop_reason === 'end_turn') {
            break
          }

          // If Claude wants to use tools, execute them
          if (finalMessage.stop_reason === 'tool_use') {
            // Add assistant's full response to messages
            messages.push({ role: 'assistant', content: finalMessage.content })

            // Execute each tool call
            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const block of finalMessage.content) {
              if (block.type === 'tool_use') {
                controller.enqueue(encoder.encode(`\n🔧 *${formatToolName(block.name)}...*\n`))
                const result = await executeTool(block.name, block.input as Record<string, unknown>)
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result,
                })
              }
            }

            // Add tool results and continue the loop
            messages.push({ role: 'user', content: toolResults })
          } else {
            // Any other stop reason, just break
            break
          }
        }

        controller.close()
      } catch (error) {
        const msg = error instanceof Anthropic.APIError
          ? `AI error (${error.status}): ${error.message}`
          : 'AI service unavailable'
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}

function formatToolName(name: string): string {
  switch (name) {
    case 'search_customers': return 'Searching customers'
    case 'create_customer': return 'Creating customer'
    case 'lookup_pricebook': return 'Checking pricebook'
    case 'create_estimate': return 'Creating estimate'
    case 'list_estimates': return 'Looking up estimates'
    default: return name
  }
}
