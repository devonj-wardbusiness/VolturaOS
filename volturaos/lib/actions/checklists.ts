'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ChecklistItem, JobChecklist } from '@/types'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

// Templates keyed by keyword match on job_type
const TEMPLATES: { keywords: string[]; items: string[] }[] = [
  {
    keywords: ['panel', 'upgrade', 'replacement', 'fpe', 'meter', 'subpanel', 'service'],
    items: [
      'Confirm scope with customer',
      'Take before photos of existing panel',
      'Kill main breaker / utility power off',
      'Remove dead front and document wiring',
      'Label all existing circuits',
      'Install new panel / equipment',
      'Transfer and label all circuits',
      'Torque all connections to spec',
      'Test all circuits and GFCI/AFCI',
      'Install dead front and label',
      'Take after photos',
      'Review completed work with customer',
      'Customer signature obtained',
    ],
  },
  {
    keywords: ['ev', 'charger', 'electric vehicle'],
    items: [
      'Confirm panel capacity / available breaker slots',
      'Plan wire route to garage',
      'Pull permit if required',
      'Run wire and install disconnect if required',
      'Mount EVSE charger',
      'Connect and torque all terminals',
      'Test charger operation',
      'Take after photos',
      'Customer signature obtained',
    ],
  },
  {
    keywords: ['troubleshoot', 'diagnostic', 'inspection'],
    items: [
      'Interview customer — describe the problem',
      'Inspect panel / breakers',
      'Test circuits with meter',
      'Inspect outlets and devices in affected area',
      'Identify root cause',
      'Quote repair if needed',
      'Complete repair',
      'Test and verify fix',
      'Document findings for customer',
    ],
  },
  {
    keywords: ['hot tub', 'spa', 'generator', 'transfer'],
    items: [
      'Confirm load requirements',
      'Plan wire route',
      'Pull permit if required',
      'Run wire and conduit',
      'Install disconnect / transfer switch',
      'Connect and torque all terminals',
      'Test operation',
      'Take after photos',
      'Customer signature obtained',
    ],
  },
]

const DEFAULT_ITEMS: string[] = [
  'Review job scope with customer',
  'Take before photos',
  'Complete electrical work',
  'Test all circuits / devices installed',
  'Clean up work area',
  'Take after photos',
  'Review completed work with customer',
  'Customer signature obtained',
]

function getTemplateItems(jobType: string): string[] {
  const jt = jobType.toLowerCase()
  for (const tmpl of TEMPLATES) {
    if (tmpl.keywords.some((kw) => jt.includes(kw))) {
      return tmpl.items
    }
  }
  return DEFAULT_ITEMS
}

export async function getOrCreateChecklist(jobId: string, jobType: string): Promise<JobChecklist> {
  await requireAuth()
  const admin = createAdminClient()

  // Return existing checklist if one exists
  const { data: existing } = await admin
    .from('job_checklists')
    .select('*')
    .eq('job_id', jobId)
    .single()

  if (existing) return existing as JobChecklist

  // Create from template
  const templateItems = getTemplateItems(jobType)
  const items: ChecklistItem[] = templateItems.map((label) => ({
    label,
    checked: false,
    required: false,
  }))

  const { data, error } = await admin
    .from('job_checklists')
    .insert({
      job_id: jobId,
      template_name: jobType,
      items,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as JobChecklist
}

export async function toggleChecklistItem(checklistId: string, itemIndex: number): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('job_checklists')
    .select('items')
    .eq('id', checklistId)
    .single()

  if (error || !data) throw new Error('Checklist not found')

  const items = (data.items as ChecklistItem[]).map((item, i) =>
    i === itemIndex ? { ...item, checked: !item.checked } : item
  )

  const allChecked = items.every((item) => item.checked)

  await admin
    .from('job_checklists')
    .update({
      items,
      updated_at: new Date().toISOString(),
      completed_at: allChecked ? new Date().toISOString() : null,
    })
    .eq('id', checklistId)
}
