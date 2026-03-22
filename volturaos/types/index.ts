export type PropertyType = 'residential' | 'commercial'
export type JobStatus = 'Lead' | 'Scheduled' | 'In Progress' | 'Completed' | 'Invoiced' | 'Paid' | 'Cancelled'
export type EstimateStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Declined'
export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid'
export type PaymentMethod = 'Check' | 'Zelle' | 'Cash' | 'Credit Card'
export type TierName = 'good' | 'better' | 'best'
export type PhotoType = 'before' | 'after' | 'permit' | 'signature' | 'other'

export interface Customer {
  id: string
  name: string
  address: string | null
  city: string
  state: string
  zip: string | null
  phone: string | null
  email: string | null
  property_type: PropertyType
  notes: string | null
  created_at: string
}

export interface CustomerEquipment {
  id: string
  customer_id: string
  type: string | null
  brand: string | null
  amperage: string | null
  age_years: number | null
  notes: string | null
}

export interface Job {
  id: string
  customer_id: string
  job_type: string
  status: JobStatus
  scheduled_date: string | null
  scheduled_time: string | null
  notes: string | null
  tech_name: string
  created_at: string
  completed_at: string | null
}

export interface PricebookEntry {
  id: string
  job_type: string
  description_good: string | null
  description_better: string | null
  description_best: string | null
  price_good: number | null
  price_better: number | null
  price_best: number | null
  includes_permit: boolean
  notes: string | null
  active: boolean
}

export interface LineItem {
  description: string
  price: number
  is_override: boolean
  original_price: number | null
  tier?: TierName
}

export interface Addon {
  name: string
  price: number
  selected: boolean
  original_price: number
}

export interface Estimate {
  id: string
  job_id: string | null
  customer_id: string
  status: EstimateStatus
  tier_selected: TierName | null
  line_items: LineItem[] | null
  addons: Addon[] | null
  subtotal: number | null
  total: number | null
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  approved_at: string | null
  declined_at: string | null
  created_at: string
}

export interface Invoice {
  id: string
  estimate_id: string | null
  job_id: string | null
  customer_id: string
  line_items: LineItem[] | null
  total: number
  amount_paid: number
  balance: number
  status: InvoiceStatus
  due_date: string | null
  notes: string | null
  created_at: string
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  paid_at: string
  notes: string | null
}

export interface ChecklistItem {
  label: string
  checked: boolean
  required: boolean
}

export interface JobChecklist {
  id: string
  job_id: string
  template_name: string | null
  items: ChecklistItem[]
  completed_at: string | null
  updated_at: string
}

export interface JobPhoto {
  id: string
  job_id: string
  url: string
  caption: string | null
  photo_type: PhotoType
  uploaded_at: string
}

export interface AIPageContext {
  mode: 'estimate' | 'upsell' | 'followup' | 'permit' | 'chat'
  jobType?: string
  customerType?: PropertyType
  propertyNotes?: string
  currentLineItems?: LineItem[]
  customerName?: string
  jobStatus?: JobStatus
  daysSinceContact?: number
}

export const DEFAULT_ADDONS: Omit<Addon, 'selected'>[] = [
  { name: 'Whole-home surge protector', price: 500, original_price: 500 },
  { name: 'AFCI breaker upgrade', price: 350, original_price: 350 },
  { name: 'Permit included', price: 250, original_price: 250 },
  { name: 'Priority scheduling', price: 150, original_price: 150 },
  { name: '1-year labor warranty', price: 200, original_price: 200 },
]
