// components/jobs/health-score/constants.ts

export const HAZARDOUS_BRANDS = new Set([
  'FPE / Stab-Lok', 'Zinsco', 'Pushmatic', 'Bulldog / Pushmatic', 'Split-Bus',
])

export const PANEL_BRANDS = [
  'Square D', 'Eaton', 'Leviton', 'Siemens', 'GE', 'Homeline',
  'FPE / Stab-Lok', 'Zinsco', 'Pushmatic', 'Split-Bus', 'Other',
]

export const SERVICE_SIZES = [60, 100, 150, 200, 400]

export const PANEL_CONDITIONS = ['Good', 'Fair', 'Poor', 'Replace'] as const

export const WIRING_TYPES = ['Copper', 'Copper/Aluminum', 'Aluminum', 'Knob-and-Tube', 'Mixed'] as const
export const HAZARDOUS_WIRING = new Set(['Knob-and-Tube'])

export interface RoomDef {
  id: string
  label: string
  icon: string
}

export const ROOMS: RoomDef[] = [
  { id: 'kitchen',     label: 'Kitchen',     icon: '🍳' },
  { id: 'bathroom_1',  label: 'Bathroom 1',  icon: '🚿' },
  { id: 'bathroom_2',  label: 'Bathroom 2',  icon: '🚿' },
  { id: 'bedroom_1',   label: 'Bedroom 1',   icon: '🛏' },
  { id: 'bedroom_2',   label: 'Bedroom 2',   icon: '🛏' },
  { id: 'bedroom_3',   label: 'Bedroom 3',   icon: '🛏' },
  { id: 'garage',      label: 'Garage',      icon: '🚗' },
  { id: 'basement',    label: 'Basement',    icon: '🏚' },
  { id: 'exterior',    label: 'Exterior',    icon: '🌿' },
]

export interface IssueDef {
  id: string
  label: string
  rooms?: string[]
}

export const ROOM_ISSUES: IssueDef[] = [
  { id: 'no_gfci',          label: 'No GFCI outlets' },
  { id: 'old_outlets',      label: 'Outdated/damaged outlets' },
  { id: 'no_exhaust_fan',   label: 'No exhaust fan',     rooms: ['bathroom_1', 'bathroom_2'] },
  { id: 'flickering_lights', label: 'Flickering lights' },
  { id: 'no_outdoor_gfci',  label: 'No outdoor GFCI outlet', rooms: ['garage', 'exterior'] },
  { id: 'missing_covers',   label: 'Missing cover plates' },
]
