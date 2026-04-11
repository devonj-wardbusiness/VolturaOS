import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TierName } from '@/types'

// Tool definitions for Claude
export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_customers',
    description: 'Search for customers by name, phone, or address. Returns matching customers with their IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search term — name, phone number, or address' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_customer',
    description: 'Create a new customer in VolturaOS. Returns the new customer record.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Customer full name' },
        phone: { type: 'string', description: 'Phone number' },
        email: { type: 'string', description: 'Email address' },
        address: { type: 'string', description: 'Street address' },
        city: { type: 'string', description: 'City (defaults to Colorado Springs)' },
        zip: { type: 'string', description: 'ZIP code' },
        property_type: { type: 'string', enum: ['residential', 'commercial'], description: 'Property type' },
        notes: { type: 'string', description: 'Any notes about the customer' },
      },
      required: ['name'],
    },
  },
  {
    name: 'lookup_pricebook',
    description: 'Look up pricing from the pricebook. Can search by job type or list all available job types with Good/Better/Best pricing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_type: { type: 'string', description: 'Job type to search for (partial match). Leave empty to list all.' },
      },
      required: [],
    },
  },
  {
    name: 'create_estimate',
    description: 'Create an estimate for a customer. Supports a primary job with tier, plus additional line items from the pricebook.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'Customer UUID from search_customers result' },
        job_type: { type: 'string', description: 'Primary job type from the pricebook (optional for items-only estimates)' },
        tier: { type: 'string', enum: ['good', 'better', 'best'], description: 'Pricing tier for primary job (default: better)' },
        additional_items: {
          type: 'array',
          description: 'Additional line items to add',
          items: {
            type: 'object',
            properties: {
              job_type: { type: 'string', description: 'Job type from pricebook' },
              tier: { type: 'string', enum: ['good', 'better', 'best'], description: 'Tier (default: better)' },
              footage: { type: 'number', description: 'Custom footage for wire/conduit items' },
            },
            required: ['job_type'],
          },
        },
        notes: { type: 'string', description: 'Optional notes for the estimate' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'list_estimates',
    description: 'List recent estimates. Shows customer name, job type, total, and status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max number of estimates to return (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'create_job',
    description: 'Create a new job for a customer. Jobs track work from lead through completion and payment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'Customer UUID from search_customers result' },
        estimate_id: { type: 'string', description: 'Optional estimate UUID to link this job to' },
        job_type: { type: 'string', description: 'Type of electrical work (e.g. "Panel upgrade 100A to 200A")' },
        scheduled_date: { type: 'string', description: 'Scheduled date in YYYY-MM-DD format' },
        scheduled_time: { type: 'string', description: 'Scheduled time like "9:00 AM"' },
        notes: { type: 'string', description: 'Job notes or special instructions' },
      },
      required: ['customer_id', 'job_type'],
    },
  },
  {
    name: 'list_jobs',
    description: 'List jobs, optionally filtered by status. Shows customer name, job type, status, and date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status: Lead, Scheduled, In Progress, Completed, Invoiced, Paid, Cancelled' },
        limit: { type: 'number', description: 'Max number of jobs to return (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'update_job_status',
    description: 'Update the status of an existing job. Valid transitions: Lead→Scheduled, Scheduled→In Progress, In Progress→Completed, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: { type: 'string', description: 'Job UUID' },
        status: { type: 'string', enum: ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Invoiced', 'Paid', 'Cancelled'], description: 'New status' },
      },
      required: ['job_id', 'status'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Create an invoice for a job or directly for a customer. Can optionally pull line items from a linked estimate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'Customer UUID' },
        job_id: { type: 'string', description: 'Optional job UUID to link this invoice to' },
        estimate_id: { type: 'string', description: 'Optional estimate UUID — if provided, line items and total are pulled from the estimate' },
        line_items: {
          type: 'array',
          description: 'Line items (required if no estimate_id). Each item has description and price.',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              price: { type: 'number' },
            },
            required: ['description', 'price'],
          },
        },
        total: { type: 'number', description: 'Invoice total (required if no estimate_id)' },
        notes: { type: 'string', description: 'Invoice notes' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'list_customers',
    description: 'List recent customers or search by name/phone/address.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Optional search term — name, phone, or address' },
        limit: { type: 'number', description: 'Max results (default 15)' },
      },
      required: [],
    },
  },
  {
    name: 'update_customer',
    description: 'Update an existing customer\'s details. Only fields provided will be changed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'Customer UUID from search_customers' },
        name: { type: 'string', description: 'New name' },
        phone: { type: 'string', description: 'New phone number' },
        email: { type: 'string', description: 'New email' },
        address: { type: 'string', description: 'New street address' },
        city: { type: 'string', description: 'New city' },
        zip: { type: 'string', description: 'New ZIP code' },
        notes: { type: 'string', description: 'Customer notes' },
        property_type: { type: 'string', enum: ['residential', 'commercial'], description: 'Property type' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'search_estimates',
    description: 'Find estimates by customer name, status, or both. Returns estimate IDs, names, totals, and status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_name: { type: 'string', description: 'Customer name to search for (partial match)' },
        customer_id: { type: 'string', description: 'Customer UUID for exact match' },
        status: { type: 'string', description: 'Filter by status: Draft, Sent, Viewed, Approved, Declined' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'update_estimate',
    description: 'Update an existing estimate — change notes, status, or add/replace line items from the pricebook.',
    input_schema: {
      type: 'object' as const,
      properties: {
        estimate_id: { type: 'string', description: 'Estimate UUID' },
        notes: { type: 'string', description: 'New notes for the estimate' },
        status: { type: 'string', enum: ['Draft', 'Sent', 'Viewed', 'Approved', 'Declined'], description: 'New status' },
        add_items: {
          type: 'array',
          description: 'Additional line items to append to existing items',
          items: {
            type: 'object',
            properties: {
              job_type: { type: 'string', description: 'Job type from pricebook' },
              tier: { type: 'string', enum: ['good', 'better', 'best'], description: 'Tier (default: better)' },
            },
            required: ['job_type'],
          },
        },
      },
      required: ['estimate_id'],
    },
  },
  {
    name: 'update_job',
    description: 'Update an existing job — change type, scheduled date/time, notes, or tech name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: { type: 'string', description: 'Job UUID from list_jobs' },
        job_type: { type: 'string', description: 'Updated job description/type' },
        scheduled_date: { type: 'string', description: 'New scheduled date YYYY-MM-DD' },
        scheduled_time: { type: 'string', description: 'New scheduled time like "9:00 AM"' },
        notes: { type: 'string', description: 'Updated notes' },
        tech_name: { type: 'string', description: 'Assigned technician name' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'list_invoices',
    description: 'List recent invoices, optionally filtered by customer or status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'Filter by customer UUID' },
        status: { type: 'string', description: 'Filter by status: Unpaid, Partial, Paid, Sent' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'record_payment',
    description: 'Record a payment against an invoice. Supports partial payments. Updates invoice balance automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoice_id: { type: 'string', description: 'Invoice UUID' },
        amount: { type: 'number', description: 'Payment amount in dollars' },
        method: { type: 'string', enum: ['Check', 'Zelle', 'Cash', 'Credit Card'], description: 'Payment method' },
        notes: { type: 'string', description: 'Payment notes (e.g. check number)' },
      },
      required: ['invoice_id', 'amount', 'method'],
    },
  },
]

// Tool execution
export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const admin = createAdminClient()

  switch (name) {
    case 'search_customers': {
      const query = (input.query as string) || ''
      const q = `%${query}%`
      const { data, error } = await admin
        .from('customers')
        .select('id, name, phone, email, address, city, property_type')
        .or(`name.ilike.${q},phone.ilike.${q},address.ilike.${q}`)
        .order('name')
        .limit(10)
      if (error) return `Error: ${error.message}`
      if (!data?.length) return `No customers found matching "${query}". You can create one with create_customer.`
      return JSON.stringify(data, null, 2)
    }

    case 'list_customers': {
      const limit = (input.limit as number) || 15
      const query = input.query as string | undefined
      let q = admin.from('customers').select('id, name, phone, email, address, city, property_type').order('name').limit(limit)
      if (query) {
        const like = `%${query}%`
        q = q.or(`name.ilike.${like},phone.ilike.${like},address.ilike.${like}`)
      }
      const { data, error } = await q
      if (error) return `Error: ${error.message}`
      if (!data?.length) return 'No customers found.'
      return JSON.stringify(data, null, 2)
    }

    case 'create_customer': {
      const { data, error } = await admin
        .from('customers')
        .insert({
          name: (input.name as string).trim(),
          phone: (input.phone as string) || null,
          email: (input.email as string) || null,
          address: (input.address as string) || null,
          city: (input.city as string) || 'Colorado Springs',
          state: 'CO',
          zip: (input.zip as string) || null,
          property_type: (input.property_type as string) || 'residential',
          notes: (input.notes as string) || null,
        })
        .select('id, name, phone, email, address, city')
        .single()
      if (error) return `Error creating customer: ${error.message}`
      return `Customer created successfully:\n${JSON.stringify(data, null, 2)}`
    }

    case 'update_customer': {
      const customerId = input.customer_id as string
      const updates: Record<string, unknown> = {}
      if (input.name) updates.name = (input.name as string).trim()
      if (input.phone !== undefined) updates.phone = input.phone
      if (input.email !== undefined) updates.email = input.email
      if (input.address !== undefined) updates.address = input.address
      if (input.city !== undefined) updates.city = input.city
      if (input.zip !== undefined) updates.zip = input.zip
      if (input.notes !== undefined) updates.notes = input.notes
      if (input.property_type !== undefined) updates.property_type = input.property_type
      if (Object.keys(updates).length === 0) return 'Error: No fields provided to update.'
      const { data, error } = await admin.from('customers').update(updates).eq('id', customerId).select('id, name, phone, email, address, city').single()
      if (error) return `Error: ${error.message}`
      return `Customer updated:\n${JSON.stringify(data, null, 2)}`
    }

    case 'lookup_pricebook': {
      const jobType = (input.job_type as string) || ''
      let query = admin.from('pricebook').select('job_type, description_good, description_better, description_best, price_good, price_better, price_best').eq('active', true)
      if (jobType) {
        query = query.ilike('job_type', `%${jobType}%`)
      }
      const { data, error } = await query.order('job_type')
      if (error) return `Error: ${error.message}`
      if (!data?.length) return `No pricebook entries found${jobType ? ` matching "${jobType}"` : ''}.`
      return JSON.stringify(data, null, 2)
    }

    case 'create_estimate': {
      const customerId = input.customer_id as string
      const primaryJobType = input.job_type as string | undefined
      const primaryTier = (input.tier as TierName) || 'better'
      const additionalItemsInput = (input.additional_items as { job_type: string; tier?: string; footage?: number }[]) || []
      const notes = (input.notes as string) || null

      const lineItems: { description: string; price: number; is_override: boolean; original_price: number; tier: string; category: string; is_primary: boolean; footage?: number | null }[] = []
      let total = 0

      // Primary job
      if (primaryJobType) {
        const { data: pbData, error: pbError } = await admin
          .from('pricebook')
          .select('*')
          .eq('job_type', primaryJobType)
          .eq('active', true)
          .single()
        if (pbError || !pbData) return `Error: Primary job type "${primaryJobType}" not found in pricebook. Use lookup_pricebook to see available types.`

        const priceField = `price_${primaryTier}` as keyof typeof pbData
        const descField = `description_${primaryTier}` as keyof typeof pbData
        const price = pbData[priceField] as number | null
        if (!price) return `Error: No ${primaryTier} tier pricing for "${primaryJobType}".`

        lineItems.push({
          description: (pbData[descField] as string) || primaryJobType,
          price,
          is_override: false,
          original_price: price,
          tier: primaryTier,
          category: (pbData.category as string) || 'Uncategorized',
          is_primary: true,
        })
        total += price
      }

      // Additional items
      for (const item of additionalItemsInput) {
        const tier = (item.tier as TierName) || 'better'
        const { data: pbData, error: pbError } = await admin
          .from('pricebook')
          .select('*')
          .eq('job_type', item.job_type)
          .eq('active', true)
          .single()
        if (pbError || !pbData) return `Error: Job type "${item.job_type}" not found in pricebook.`

        let price: number
        let isOverride = false

        if (item.footage && (pbData.per_foot_rate as number)) {
          price = Math.round((pbData.per_foot_rate as number) * item.footage)
          isOverride = true
        } else {
          const priceField = `price_${tier}` as keyof typeof pbData
          price = (pbData[priceField] as number) || 0
        }

        const descField = `description_${tier}` as keyof typeof pbData
        lineItems.push({
          description: (pbData[descField] as string) || item.job_type,
          price,
          is_override: isOverride,
          original_price: price,
          tier,
          category: (pbData.category as string) || 'Uncategorized',
          is_primary: false,
          footage: item.footage ?? null,
        })
        total += price
      }

      if (lineItems.length === 0) return 'Error: Provide job_type for a primary job, or additional_items, or both.'

      // Get customer name
      const { data: customer } = await admin.from('customers').select('name').eq('id', customerId).single()
      const customerName = customer?.name || 'Unknown'

      const { data, error } = await admin
        .from('estimates')
        .insert({
          customer_id: customerId,
          status: 'Draft',
          tier_selected: null,
          name: 'Estimate',
          line_items: lineItems,
          subtotal: total,
          total,
          notes,
        })
        .select('id, status, total, created_at')
        .single()
      if (error) return `Error creating estimate: ${error.message}`

      const summary = lineItems.map((li) =>
        `  - ${li.description}${li.footage ? ` (${li.footage}ft)` : ''}: $${li.price.toLocaleString()} [${li.tier}]${li.is_primary ? ' (primary)' : ''}`
      ).join('\n')

      return `Estimate created!
- Customer: ${customerName}
- Items:
${summary}
- Total: $${total.toLocaleString()}
- Status: Draft
- Estimate ID: ${data.id}

View and edit in the Estimates tab.`
    }

    case 'search_estimates': {
      const limit = (input.limit as number) || 10
      let query = admin.from('estimates').select('id, name, status, total, notes, created_at, customers(id, name)').order('created_at', { ascending: false }).limit(limit)
      if (input.customer_id) query = query.eq('customer_id', input.customer_id as string)
      if (input.status) query = query.eq('status', input.status as string)
      const { data, error } = await query
      if (error) return `Error: ${error.message}`
      if (!data?.length) return 'No estimates found.'
      // Filter by customer name if provided
      let results = data as Record<string, unknown>[]
      if (input.customer_name) {
        const search = (input.customer_name as string).toLowerCase()
        results = results.filter((e) => {
          const c = e.customers as Record<string, unknown> | null
          return (c?.name as string || '').toLowerCase().includes(search)
        })
      }
      return JSON.stringify(results.map((e) => ({
        id: e.id,
        id_short: (e.id as string).slice(0, 8),
        customer: (e.customers as Record<string, unknown> | null)?.name || 'Unknown',
        name: e.name,
        status: e.status,
        total: e.total ? `$${(e.total as number).toLocaleString()}` : '—',
        created: new Date(e.created_at as string).toLocaleDateString(),
      })), null, 2)
    }

    case 'update_estimate': {
      const estimateId = input.estimate_id as string
      const updates: Record<string, unknown> = {}

      if (input.notes !== undefined) updates.notes = input.notes
      if (input.status) {
        updates.status = input.status
        const now = new Date().toISOString()
        if (input.status === 'Sent') updates.sent_at = now
        if (input.status === 'Approved') updates.approved_at = now
        if (input.status === 'Declined') updates.declined_at = now
      }

      // Add items from pricebook
      const addItems = (input.add_items as { job_type: string; tier?: string }[]) || []
      if (addItems.length > 0) {
        const { data: existing, error: fetchErr } = await admin.from('estimates').select('line_items, total').eq('id', estimateId).single()
        if (fetchErr) return `Error fetching estimate: ${fetchErr.message}`

        const currentItems = (existing.line_items as { description: string; price: number; is_override: boolean; original_price: number }[]) || []
        let currentTotal = (existing.total as number) || 0
        const newItems = [...currentItems]

        for (const item of addItems) {
          const tier = item.tier || 'better'
          const { data: pb } = await admin.from('pricebook').select('*').eq('job_type', item.job_type).eq('active', true).single()
          if (!pb) return `Error: "${item.job_type}" not found in pricebook.`
          const price = (pb[`price_${tier}` as keyof typeof pb] as number) || 0
          const desc = (pb[`description_${tier}` as keyof typeof pb] as string) || item.job_type
          newItems.push({ description: desc, price, is_override: false, original_price: price })
          currentTotal += price
        }
        updates.line_items = newItems
        updates.total = currentTotal
        updates.subtotal = currentTotal
      }

      if (Object.keys(updates).length === 0) return 'Error: No changes provided.'
      const { error } = await admin.from('estimates').update(updates).eq('id', estimateId)
      if (error) return `Error updating estimate: ${error.message}`
      return `Estimate updated successfully.${addItems.length > 0 ? ` Added ${addItems.length} item(s).` : ''}`
    }

    case 'list_estimates': {
      const limit = (input.limit as number) || 10
      const { data, error } = await admin
        .from('estimates')
        .select('id, status, name, total, notes, created_at, customers(name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) return `Error: ${error.message}`
      if (!data?.length) return 'No estimates found yet.'
      const formatted = data.map((e: Record<string, unknown>) => {
        const customers = e.customers as Record<string, unknown> | null
        return {
          id: (e.id as string).slice(0, 8) + '...',
          customer: customers?.name || 'Unknown',
          name: (e.name as string) || 'Estimate',
          total: e.total ? `$${(e.total as number).toLocaleString()}` : '—',
          status: e.status,
          created: new Date(e.created_at as string).toLocaleDateString(),
        }
      })
      return JSON.stringify(formatted, null, 2)
    }

    case 'update_job': {
      const jobId = input.job_id as string
      const updates: Record<string, unknown> = {}
      if (input.job_type !== undefined) updates.job_type = input.job_type
      if (input.scheduled_date !== undefined) updates.scheduled_date = input.scheduled_date
      if (input.scheduled_time !== undefined) updates.scheduled_time = input.scheduled_time
      if (input.notes !== undefined) updates.notes = input.notes
      if (input.tech_name !== undefined) updates.tech_name = input.tech_name
      if (Object.keys(updates).length === 0) return 'Error: No fields provided to update.'
      const { data, error } = await admin.from('jobs').update(updates).eq('id', jobId).select('id, job_type, status, scheduled_date, customers(name)').single()
      if (error) return `Error updating job: ${error.message}`
      const c = (data as Record<string, unknown>).customers as Record<string, unknown> | null
      return `Job updated!\n- Customer: ${c?.name || 'Unknown'}\n- Type: ${data.job_type}\n- Status: ${data.status}${data.scheduled_date ? `\n- Scheduled: ${data.scheduled_date}` : ''}`
    }

    case 'list_invoices': {
      const limit = (input.limit as number) || 10
      let query = admin.from('invoices').select('id, status, total, amount_paid, created_at, customers(name)').order('created_at', { ascending: false }).limit(limit)
      if (input.customer_id) query = query.eq('customer_id', input.customer_id as string)
      if (input.status) query = query.eq('status', input.status as string)
      const { data, error } = await query
      if (error) return `Error: ${error.message}`
      if (!data?.length) return 'No invoices found.'
      return JSON.stringify(data.map((inv: Record<string, unknown>) => ({
        id: inv.id,
        id_short: (inv.id as string).slice(0, 8),
        customer: (inv.customers as Record<string, unknown> | null)?.name || 'Unknown',
        status: inv.status,
        total: `$${(inv.total as number).toLocaleString()}`,
        paid: `$${((inv.amount_paid as number) || 0).toLocaleString()}`,
        balance: `$${((inv.total as number) - ((inv.amount_paid as number) || 0)).toLocaleString()}`,
        created: new Date(inv.created_at as string).toLocaleDateString(),
      })), null, 2)
    }

    case 'create_job': {
      const customerId = input.customer_id as string
      const jobType = input.job_type as string

      // Get customer name
      const { data: cust } = await admin.from('customers').select('name').eq('id', customerId).single()
      const customerName = cust?.name || 'Unknown'

      const { data, error } = await admin
        .from('jobs')
        .insert({
          customer_id: customerId,
          estimate_id: (input.estimate_id as string) || null,
          job_type: jobType,
          status: input.scheduled_date ? 'Scheduled' : 'Lead',
          scheduled_date: (input.scheduled_date as string) || null,
          scheduled_time: (input.scheduled_time as string) || null,
          notes: (input.notes as string) || null,
        })
        .select('id, status, job_type, scheduled_date, created_at')
        .single()
      if (error) return `Error creating job: ${error.message}`

      return `Job created successfully!
- Customer: ${customerName}
- Type: ${jobType}
- Status: ${data.status}
${data.scheduled_date ? `- Scheduled: ${data.scheduled_date}` : ''}
- Job ID: ${data.id}

View this job in the Jobs tab.`
    }

    case 'list_jobs': {
      const limit = (input.limit as number) || 10
      const status = input.status as string | undefined
      let query = admin
        .from('jobs')
        .select('id, job_type, status, scheduled_date, created_at, customers(name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (error) return `Error: ${error.message}`
      if (!data?.length) return `No jobs found${status ? ` with status "${status}"` : ''}.`
      const formatted = data.map((j: Record<string, unknown>) => {
        const customers = j.customers as Record<string, unknown> | null
        return {
          id: (j.id as string).slice(0, 8) + '...',
          customer: customers?.name || 'Unknown',
          type: j.job_type,
          status: j.status,
          scheduled: j.scheduled_date || '—',
          created: new Date(j.created_at as string).toLocaleDateString(),
        }
      })
      return JSON.stringify(formatted, null, 2)
    }

    case 'update_job_status': {
      const jobId = input.job_id as string
      const status = input.status as string
      const { data, error } = await admin
        .from('jobs')
        .update({ status })
        .eq('id', jobId)
        .select('id, job_type, status, customers(name)')
        .single()
      if (error) return `Error updating job: ${error.message}`
      const customers = (data as Record<string, unknown>).customers as Record<string, unknown> | null
      return `Job updated!
- Customer: ${customers?.name || 'Unknown'}
- Type: ${data.job_type}
- New Status: ${data.status}`
    }

    case 'create_invoice': {
      const customerId = input.customer_id as string
      const estimateId = input.estimate_id as string | undefined
      const jobId = input.job_id as string | undefined

      let lineItems: { description: string; price: number }[]
      let total: number

      if (estimateId) {
        // Pull from estimate
        const { data: est, error: estErr } = await admin
          .from('estimates')
          .select('line_items, total')
          .eq('id', estimateId)
          .single()
        if (estErr || !est) return `Error: Estimate not found.`
        lineItems = est.line_items as { description: string; price: number }[]
        total = est.total as number
      } else if (input.line_items && input.total) {
        lineItems = input.line_items as { description: string; price: number }[]
        total = input.total as number
      } else {
        return 'Error: Provide either estimate_id OR both line_items and total.'
      }

      // Get customer name
      const { data: cust } = await admin.from('customers').select('name').eq('id', customerId).single()
      const customerName = cust?.name || 'Unknown'

      const { data, error } = await admin
        .from('invoices')
        .insert({
          customer_id: customerId,
          job_id: jobId || null,
          estimate_id: estimateId || null,
          line_items: lineItems,
          total,
          amount_paid: 0,
          status: 'Sent',
          notes: (input.notes as string) || null,
        })
        .select('id, status, total, created_at')
        .single()
      if (error) return `Error creating invoice: ${error.message}`

      // Update job status to Invoiced if linked
      if (jobId) {
        await admin.from('jobs').update({ status: 'Invoiced' }).eq('id', jobId)
      }

      return `Invoice created!
- Customer: ${customerName}
- Total: $${total.toLocaleString()}
- Status: Sent
- Invoice ID: ${data.id}

View this invoice in the Invoices tab.`
    }

    case 'record_payment': {
      const invoiceId = input.invoice_id as string
      const amount = input.amount as number
      const method = input.method as string

      // Get current invoice
      const { data: inv, error: invErr } = await admin
        .from('invoices')
        .select('total, amount_paid, status, customers(name)')
        .eq('id', invoiceId)
        .single()
      if (invErr || !inv) return 'Error: Invoice not found.'

      const currentPaid = (inv.amount_paid as number) || 0
      const newPaid = currentPaid + amount
      const total = inv.total as number
      const newStatus = newPaid >= total ? 'Paid' : 'Partial'

      // Insert payment record
      const { error: payErr } = await admin
        .from('invoice_payments')
        .insert({
          invoice_id: invoiceId,
          amount,
          method,
          notes: (input.notes as string) || null,
        })
      if (payErr) return `Error recording payment: ${payErr.message}`

      // Update invoice
      const { error: updErr } = await admin
        .from('invoices')
        .update({ amount_paid: newPaid, status: newStatus })
        .eq('id', invoiceId)
      if (updErr) return `Error updating invoice: ${updErr.message}`

      const customers = inv.customers as unknown as Record<string, unknown> | null
      return `Payment recorded!
- Customer: ${customers?.name || 'Unknown'}
- Amount: $${amount.toLocaleString()}
- Method: ${method}
- Total Paid: $${newPaid.toLocaleString()} / $${total.toLocaleString()}
- Status: ${newStatus}
${newPaid >= total ? '✅ Invoice is fully paid!' : `⚠️ Remaining balance: $${(total - newPaid).toLocaleString()}`}`
    }

    default:
      return `Unknown tool: ${name}`
  }
}
