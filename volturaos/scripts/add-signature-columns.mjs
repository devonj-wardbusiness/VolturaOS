import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Add signature columns to estimates table
const { error } = await supabase.rpc('exec_sql', {
  sql: `
    ALTER TABLE estimates
      ADD COLUMN IF NOT EXISTS signer_name text,
      ADD COLUMN IF NOT EXISTS signature_data text,
      ADD COLUMN IF NOT EXISTS signed_at timestamptz;
  `
})

if (error) {
  // Try direct approach — Supabase may not have exec_sql RPC
  // In that case, run this SQL manually in the Supabase SQL editor:
  console.error('RPC failed:', error.message)
  console.log('\nRun this SQL in your Supabase SQL editor:\n')
  console.log(`ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;`)
} else {
  console.log('✅ Signature columns added to estimates table')
}
