import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const items = [
  // ── 230.67 (NEW NEC 2023) ─────────────────────────────────────────────────
  {
    job_type: 'Whole-Home Surge Protector',
    category: 'Code Compliance',
    description_good: 'Type 2 SPD installed at main panel. Required on all new service installations per NEC 230.67 (2023). Protects panel and branch circuits from voltage spikes.',
    description_better: 'Type 2 SPD with LED status indicator and audible fault alarm. 80kA surge rating. Required per NEC 230.67. Includes permit line item documentation.',
    description_best: 'Whole-home Type 1+2 SPD — dual-stage protection at service entrance and main panel. 200kA rating, remote monitoring capable. Code-required on new services, recommended on all upgrades.',
    price_good: 225,
    price_better: 375,
    price_best: 575,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 230.67 (2023) — required on all new service installations. Strongly recommended on panel upgrades. Protects against utility surges, lightning, and load switching.',
  },

  // ── 210.12 (AFCI) ────────────────────────────────────────────────────────
  {
    job_type: 'AFCI Breaker — Single Pole 15A',
    category: 'Code Compliance',
    description_good: 'Combination AFCI circuit breaker, 15A single pole. Required per NEC 210.12 for bedroom, living room, family room, hallway, and similar areas in dwelling units.',
    description_better: 'Name-brand combination AFCI breaker (Square D QO or Eaton CH), 15A. Enhanced arc detection, lower nuisance tripping. Includes installation and panel labeling.',
    description_best: 'Smart AFCI breaker with self-test, remote monitoring app integration. 15A. Includes installation, circuit test, and documentation for inspection.',
    price_good: 65,
    price_better: 95,
    price_best: 145,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 210.12 (2023) — required for 120V 15A/20A branch circuits in virtually all rooms of a dwelling unit. Combination type (CAFCI) is standard.',
  },
  {
    job_type: 'AFCI Breaker — Single Pole 20A',
    category: 'Code Compliance',
    description_good: 'Combination AFCI circuit breaker, 20A single pole. Required per NEC 210.12. Standard for kitchen small appliance, laundry, and all 20A dwelling unit branch circuits.',
    description_better: 'Name-brand AFCI breaker (Square D QO or Eaton CH), 20A. Lower nuisance tripping, AFCI + GFCI dual protection available. Includes installation and labeling.',
    description_best: 'Dual-function AFCI/GFCI 20A breaker. Provides both arc-fault and ground-fault protection from a single breaker — eliminates need for GFCI outlets on that circuit.',
    price_good: 75,
    price_better: 110,
    price_best: 165,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 210.12 (2023) — 20A version for kitchen, laundry, general circuits. AFCI/GFCI combo breaker satisfies both 210.8 and 210.12 at once.',
  },

  // ── 210.8 (GFCI) ─────────────────────────────────────────────────────────
  {
    job_type: 'GFCI Outlet — 15A',
    category: 'Code Compliance',
    description_good: 'Standard GFCI outlet, 15A/125V, with test/reset buttons. Required per NEC 210.8 in bathrooms, garages, outdoors, kitchens (within 6ft of sink), unfinished basements, and crawl spaces.',
    description_better: 'Tamper-resistant GFCI outlet, 15A. Meets both NEC 210.8 (GFCI) and 406.12 (tamper-resistant) requirements in one device. LED status indicator.',
    description_best: 'Smart TR GFCI outlet with self-test, USB-A+C charging ports. Auto-monitoring alerts if protection fails. Meets NEC 210.8 and 406.12.',
    price_good: 45,
    price_better: 65,
    price_best: 95,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 210.8 (2023) — required in bathrooms, garages, outdoors, kitchen countertop (6ft of sink), unfinished basements, crawl spaces, sump pump locations.',
  },
  {
    job_type: 'GFCI Outlet — 20A',
    category: 'Code Compliance',
    description_good: 'GFCI outlet, 20A/125V. Required on 20A kitchen countertop, bathroom, garage, and outdoor circuits. Test/reset included.',
    description_better: 'Tamper-resistant GFCI, 20A. Satisfies NEC 210.8 and 406.12. T-slot face accepts both 15A and 20A plugs. Includes installation.',
    description_best: 'Dual-function GFCI/AFCI 20A outlet or smart GFCI with self-test. For kitchen and laundry circuits requiring both protections. Includes installation and test.',
    price_good: 55,
    price_better: 80,
    price_best: 115,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 210.8 (2023) — 20A version for kitchen countertop, bathroom on 20A circuit, commercial kitchen locations.',
  },

  // ── 406.12 (Tamper-Resistant Receptacles) ────────────────────────────────
  {
    job_type: 'Tamper-Resistant Receptacle Upgrade',
    category: 'Code Compliance',
    description_good: 'Replace standard receptacle with tamper-resistant (TR) outlet. Required per NEC 406.12 on all 15A and 20A 125V receptacles in dwelling units. Internal spring shutters block objects.',
    description_better: 'TR duplex receptacle, commercial-grade, 20A face on 15A circuit. Meets NEC 406.12. Includes new wall plate and installation.',
    description_best: 'Smartly placed TR outlets with USB-C charging built in. Meets NEC 406.12. Ideal for bedrooms, living rooms, and kitchen countertop non-GFCI locations.',
    price_good: 25,
    price_better: 45,
    price_best: 75,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 406.12 (2023) — ALL 15A and 20A 125V receptacles in dwelling units must be tamper-resistant. Required on any new or replaced receptacle, new construction, and remodels.',
  },

  // ── 250.53 (Dual Ground Rod) ──────────────────────────────────────────────
  {
    job_type: 'Dual Ground Rod System',
    category: 'Code Compliance',
    description_good: 'Install second 8ft ground rod when first rod resistance exceeds 25 ohms. Required per NEC 250.53(A)(2). Rods spaced 6ft apart minimum, bonded with 6 AWG bare copper.',
    description_better: 'Dual ground rod system with earth resistance test documentation. Proper spacing, bonding, and burial depth. Ground clamps and acorn connectors. Test results provided.',
    description_best: 'Dual ground rod with soil enhancement compound around rods for low-resistance connection. Full grounding electrode system inspection, documentation, and bonding to water pipe if metallic.',
    price_good: 185,
    price_better: 285,
    price_best: 425,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 250.53(A)(2) — if single ground rod exceeds 25 ohms, a second rod required. Both rods 8ft min, spaced 6ft apart, bonded with GEC. Common on panel upgrades and new services.',
  },

  // ── 408.4 (Panel Labeling) ────────────────────────────────────────────────
  {
    job_type: 'Panel Circuit Directory & Labeling',
    category: 'Code Compliance',
    description_good: 'Label all breakers with circuit descriptions (kitchen countertop, master bedroom, garage, etc.) per NEC 408.4. Required on all panels. Printed label sheet installed.',
    description_better: 'Full typed circuit directory with room, load, wire gauge, and breaker size for each circuit. Laminated directory, color-coded breaker identifiers. Required per NEC 408.4.',
    description_best: 'Digital + physical circuit directory. Every circuit documented with load, wire size, run length, and connected devices. QR code on panel links to digital record. Required on all new/upgraded panels.',
    price_good: 65,
    price_better: 125,
    price_best: 225,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 408.4 (2023) — every circuit must be legibly identified as to purpose and area served. Required on all new installations and panel upgrades. Inspectors check this.',
  },

  // ── 110.16 (Arc-Flash Warning Label) ─────────────────────────────────────
  {
    job_type: 'Arc-Flash Hazard Warning Label',
    category: 'Code Compliance',
    description_good: 'Apply NEC 110.16-compliant arc-flash warning label to panel or switchgear. Required on all equipment where an arc-flash hazard exists. Standard NFPA 70E format.',
    description_better: 'Printed arc-flash label with equipment-specific incident energy data and PPE category. Meets NEC 110.16 and NFPA 70E. Includes nominal voltage and available fault current.',
    description_best: 'Full arc-flash study label with calculated incident energy, arc flash boundary, PPE category, and working distance. Engineered per NFPA 70E. Required on 480V+ commercial.',
    price_good: 35,
    price_better: 85,
    price_best: 350,
    includes_permit: false,
    active: true,
    is_footage_item: false,
    notes: 'NEC 110.16 (2023) — arc-flash hazard warning required on service equipment, switchboards, panelboards, and motor control centers. Inspectors verify on commercial jobs.',
  },
]

const { data, error } = await supabase.from('pricebook').insert(items).select('id, job_type')
if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}
console.log('Inserted NEC Code Compliance items:')
data.forEach(r => console.log(' -', r.job_type, '→', r.id))
