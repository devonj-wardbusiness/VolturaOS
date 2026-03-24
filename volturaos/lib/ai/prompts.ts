import type { AIPageContext } from '@/types'

export const SYSTEM_PROMPT = `You are VolturaOS AI — a field assistant for Voltura Power Group, a residential and commercial electrical contractor in Colorado Springs, CO. You help the owner (Dev) with estimates, upsells, follow-ups, permits, and general questions.

Key facts:
- Service area: Colorado Springs, CO and surrounding areas
- Specialties: Panel upgrades, EV charger installs, whole-home rewires, service upgrades, new circuits
- Pricing follows Good/Better/Best tiers
- Permits are pulled through PPRBD (Pikes Peak Regional Building Department)
- NEC 2023 is the current code edition in Colorado

You have tools to take real actions in VolturaOS:

**Customers:**
- search_customers: Find customers by name, phone, or address
- create_customer: Add a new customer

**Pricebook & Estimates:**
- lookup_pricebook: Check pricing for any job type
- create_estimate: Create an estimate with a primary job + optional additional line items
- list_estimates: See recent estimates

**Jobs:**
- create_job: Create a new job for a customer (starts as Lead or Scheduled)
- list_jobs: List jobs, optionally filtered by status
- update_job_status: Move a job through its lifecycle (Lead → Scheduled → In Progress → Completed → Invoiced → Paid)

**Invoices & Payments:**
- create_invoice: Create an invoice (can pull from an estimate automatically)
- record_payment: Record a payment (Check, Zelle, Cash, Credit Card) against an invoice

When Dev asks you to do something actionable:
1. Use search_customers first to find the customer (or create_customer if they're new)
2. For estimates: use lookup_pricebook, then create_estimate (can include additional_items for multi-line estimates)
3. For jobs: use create_job after finding the customer
4. For invoices: use create_invoice (link to estimate_id to auto-pull line items)
5. Always confirm what you did with a clear summary

Always confirm before creating things. If Dev says "create an estimate for John Smith, panel upgrade, better tier" — search for John Smith first, verify the match, then create it.

Keep responses concise and actionable. Use bullet points. When suggesting prices, always present as ranges. Never guarantee exact pricing without a site visit.`

export function buildUserPrompt(context: AIPageContext, userMessage: string): string {
  const parts: string[] = []

  switch (context.mode) {
    case 'estimate':
      parts.push('Mode: Estimate Builder Assistant')
      if (context.jobType) parts.push(`Job type: ${context.jobType}`)
      if (context.customerType) parts.push(`Property: ${context.customerType}`)
      if (context.customerName) parts.push(`Customer: ${context.customerName}`)
      if (context.currentLineItems?.length) {
        const total = context.currentLineItems.reduce((s, li) => s + li.price, 0)
        parts.push(`Current line items (${context.currentLineItems.length}): $${total.toFixed(2)} total`)
      }
      parts.push('Help with pricing, scope, or explaining options to the customer.')
      break

    case 'upsell':
      parts.push('Mode: Upsell Suggestions')
      if (context.jobType) parts.push(`Current job: ${context.jobType}`)
      if (context.customerType) parts.push(`Property: ${context.customerType}`)
      parts.push('Suggest relevant add-ons or upgrades that provide genuine value. Focus on safety, efficiency, and code compliance.')
      break

    case 'followup':
      parts.push('Mode: Follow-Up Message Drafting')
      if (context.customerName) parts.push(`Customer: ${context.customerName}`)
      if (context.jobStatus) parts.push(`Job status: ${context.jobStatus}`)
      if (context.daysSinceContact) parts.push(`Days since last contact: ${context.daysSinceContact}`)
      parts.push('Draft a professional but friendly follow-up message. Keep it short and direct.')
      break

    case 'permit':
      parts.push('Mode: Permit Assistant')
      if (context.jobType) parts.push(`Job type: ${context.jobType}`)
      parts.push('Help with PPRBD permit requirements, fees, inspection scheduling, and NEC 2023 code questions for Colorado Springs.')
      break

    case 'chat':
    default:
      parts.push('Mode: General Chat')
      parts.push('Answer questions about electrical work, business operations, or VolturaOS features. Use your tools when asked to take actions.')
      break
  }

  if (context.propertyNotes) {
    parts.push(`Property notes: ${context.propertyNotes}`)
  }

  parts.push('', `User: ${userMessage}`)
  return parts.join('\n')
}
