import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const items = [
  {
    job_type: 'Drywall Patch — Level 1',
    category: 'Drywall & Paint',
    description_good: 'Patch and seal small hole (up to 6 in). Basic compound fill, sanded smooth.',
    description_better: 'Patch, skim coat, and light texture blend to blend with surrounding wall.',
    description_best: 'Full patch with texture match, sanded, and primed — ready for paint.',
    price_good: 85,
    price_better: 135,
    price_best: 185,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'Small single hole — outlet, switch, or fixture box sized',
  },
  {
    job_type: 'Drywall Patch — Level 2',
    category: 'Drywall & Paint',
    description_good: 'Patch medium opening (6–18 in) with backer support, compound fill, sanded.',
    description_better: 'Patch with mesh, skim coat, and texture blend over repaired area.',
    description_best: 'Full repair with backing, multi-coat finish, texture match, and primer coat.',
    price_good: 175,
    price_better: 285,
    price_best: 385,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'Medium opening — circuit run, multi-hole section, 6–18 inches',
  },
  {
    job_type: 'Drywall Patch — Level 3',
    category: 'Drywall & Paint',
    description_good: 'Patch large area (18 in+) with new drywall section, taped, mudded, sanded.',
    description_better: 'New drywall section installed, full tape and multi-coat mud, texture blended.',
    description_best: 'Full panel repair with new drywall, tape, multiple coats, texture match, primed.',
    price_good: 325,
    price_better: 500,
    price_best: 675,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'Large area — panel upgrade area, service entrance, major circuit runs, 18 in+',
  },
  {
    job_type: 'Paint Touch-Up',
    category: 'Drywall & Paint',
    description_good: 'Paint patched area with customer-supplied paint. One coat.',
    description_better: 'Two-coat paint on patched area. We attempt color match from sample or paint code.',
    description_best: 'Full blend — two coats on patched area, feathered into surrounding wall for seamless finish.',
    price_good: 65,
    price_better: 110,
    price_best: 165,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'Patched area only — not full room. Exact color match not guaranteed.',
  },
  {
    job_type: 'Area Painting',
    category: 'Drywall & Paint',
    description_good: 'Single-color paint on one wall or area up to 200 sq ft. One coat, customer supplies paint.',
    description_better: 'Two-coat paint, up to 200 sq ft. We supply paint (standard color match). Cut-in included.',
    description_best: 'Full two-coat application with cut-in, trim masking, drop cloths, and cleanup. Up to 400 sq ft.',
    price_good: 325,
    price_better: 525,
    price_best: 725,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'Per area pricing — additional sq footage billed at agreed rate',
  },
]

const { data, error } = await supabase.from('pricebook').insert(items).select('id, job_type')
if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}
console.log('Inserted:')
data.forEach(r => console.log(' -', r.job_type, '→', r.id))
