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
  sms_opt_out: boolean
  referral_source: string | null
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
  permit_number: string | null
  permit_status: string | null
  review_requested_at: string | null
}

export type FormType = 'material_list' | 'permission_to_cut' | 'safety_waiver'

export interface Form {
  id: string
  job_id: string
  customer_id: string
  form_type: FormType
  status: 'Draft' | 'Sent' | 'Viewed' | 'Approved'
  line_items: { name: string; qty: string }[] | null  // material_list only
  signer_name: string | null
  signature_data: string | null
  signed_at: string | null
  created_at: string
}

export type PermitStatus = 'Not Applied' | 'Applied' | 'Approved' | 'Inspected' | 'Final'

export interface JobTimeEntry {
  id: string
  job_id: string
  clocked_in_at: string
  clocked_out_at: string | null
  notes: string | null
  created_at: string
}

export interface HomeInspection {
  id: string
  customer_id: string
  job_id: string | null
  score: number
  panel_age: number | null
  panel_condition: string | null
  has_afci: boolean
  afci_rooms: number
  has_gfci: boolean
  gfci_locations: number
  has_surge: boolean
  grounding_ok: boolean
  wiring_type: string | null
  notes: string | null
  created_at: string
}

export interface MaintenancePlan {
  id: string
  customer_id: string
  plan_name: string
  price: number
  start_date: string
  next_due: string
  status: string
  notes: string | null
  created_at: string
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
  category: string
  per_foot_rate: number | null
  is_footage_item: boolean
  footage_group: string | null
  use_count: number
  last_used_at: string | null
}

export interface LineItem {
  description: string
  price: number
  is_override: boolean
  original_price: number | null
  pricebook_description?: string  // plain-English explanation for customer
  tier?: TierName
  category?: string
  footage?: number | null
  is_primary?: boolean
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
  name: string
  proposal_id: string | null
  tier_selected: TierName | null
  line_items: LineItem[] | null
  addons: Addon[] | null
  subtotal: number | null
  total: number | null
  notes: string | null
  includes_permit: boolean
  includes_cleanup: boolean
  includes_warranty: boolean
  sent_at: string | null
  follow_up_days: number
  follow_up_sent_at: string | null
  follow_up_dismissed: boolean
  viewed_at: string | null
  approved_at: string | null
  declined_at: string | null
  created_at: string
  is_template: boolean
  signer_name: string | null
  signature_data: string | null
  signed_at: string | null
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
  review_requested_at: string | null
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  paid_at: string
  notes: string | null
}

export interface Referral {
  id: string
  estimate_id: string | null
  name: string
  phone: string
  project_notes: string | null
  created_at: string
}

export interface MaintenanceAgreement {
  id: string
  customer_id: string
  price: number
  status: string  // 'Active' | 'Expired' | 'Cancelled'
  start_date: string
  renewal_date: string
  renewal_reminder_sent: boolean
  invoice_id: string | null
  notes: string | null
  created_at: string
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

export interface HistoryItem {
  type: 'job' | 'invoice' | 'estimate'
  id: string
  title: string
  status: string
  amount?: number
  date: string
  href: string
}

export interface ChangeOrder {
  id: string
  job_id: string
  estimate_id: string | null
  line_items: LineItem[]
  total: number
  signature_data: string | null
  status: 'Draft' | 'Pending' | 'Signed'
  notes: string | null
  created_at: string
}

export type JobWithContext = {
  job: Job & { customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'> }
  checklist: JobChecklist
  photos: import('@/lib/actions/job-photos').JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  estimates: Array<Pick<Estimate, 'id' | 'name' | 'total' | 'status' | 'line_items' | 'addons' | 'created_at'>>
  invoices: Invoice[]
  jobHistory: Job[]
}

export const DEFAULT_ADDONS: Omit<Addon, 'selected'>[] = [
  { name: 'Whole-home surge protector', price: 500, original_price: 500 },
  { name: 'AFCI breaker upgrade', price: 350, original_price: 350 },
  { name: 'Permit included', price: 250, original_price: 250 },
  { name: 'Priority scheduling', price: 150, original_price: 150 },
  { name: '1-year labor warranty', price: 200, original_price: 200 },
]
