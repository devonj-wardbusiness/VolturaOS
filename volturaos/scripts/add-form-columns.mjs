// scripts/add-form-columns.mjs
// Run with: node --env-file=.env.local scripts/add-form-columns.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const sql = `
  ALTER TABLE estimates
    ADD COLUMN IF NOT EXISTS form_type text CHECK (
      form_type IN ('material_list', 'permission_to_cut', 'safety_waiver')
    ),
    ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE CASCADE;
`

const { error } = await supabase.rpc('exec_sql', { sql })

if (error) {
  console.error('RPC failed:', error.message)
  console.log('\nRun this SQL manually in the Supabase SQL editor:\n')
  console.log(sql)
} else {
  console.log('✅ form_type and job_id columns added to estimates table')
}
