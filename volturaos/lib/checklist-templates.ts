import type { ChecklistItem } from '@/types'

export interface ChecklistTemplate {
  name: string
  jobTypeMatch: string[]
  items: ChecklistItem[]
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    name: 'Panel Upgrade',
    jobTypeMatch: ['Panel upgrade 100A→200A', 'Panel upgrade 200A→400A'],
    items: [
      { label: 'Called utility for coordination', checked: false, required: true },
      { label: 'Permit pulled', checked: false, required: true },
      { label: 'Old panel photos taken', checked: false, required: false },
      { label: 'Main breaker off + verified', checked: false, required: true },
      { label: 'All circuits labeled', checked: false, required: true },
      { label: 'Torque specs verified', checked: false, required: true },
      { label: 'AFCI/GFCI installed where required', checked: false, required: true },
      { label: 'Inspection scheduled', checked: false, required: false },
      { label: 'Final photos taken', checked: false, required: false },
    ],
  },
  {
    name: 'EV Charger',
    jobTypeMatch: ['EV Charger L2 (circuit only)', 'EV Charger L2 (full install)'],
    items: [
      { label: 'Load calculation done', checked: false, required: true },
      { label: 'Dedicated circuit run', checked: false, required: true },
      { label: 'Correct amperage verified', checked: false, required: true },
      { label: 'Permit pulled', checked: false, required: true },
      { label: 'Charger mounted and secured', checked: false, required: false },
      { label: 'Tested with vehicle', checked: false, required: false },
      { label: 'Photos taken', checked: false, required: false },
    ],
  },
  {
    name: 'Standard Service',
    jobTypeMatch: [],
    items: [
      { label: 'Before photo taken', checked: false, required: false },
      { label: 'Diagnosis confirmed with customer', checked: false, required: true },
      { label: 'Parts used logged', checked: false, required: false },
      { label: 'Work completed', checked: false, required: true },
      { label: 'After photo taken', checked: false, required: false },
      { label: 'Customer signed off', checked: false, required: false },
    ],
  },
]

export function getTemplate(jobType: string): ChecklistTemplate {
  const match = CHECKLIST_TEMPLATES.find((t) => t.jobTypeMatch.includes(jobType))
  return match ?? CHECKLIST_TEMPLATES[CHECKLIST_TEMPLATES.length - 1]
}
