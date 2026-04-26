import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { NecReference } from '@/components/tools/NecReference'
import type { PricebookEntry } from '@/types'

export const dynamic = 'force-dynamic'

async function getCodeCompliancePricebook(): Promise<PricebookEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .eq('category', 'Code Compliance')
    .order('job_type')
  if (error) return []
  return data as PricebookEntry[]
}

export default async function NecPage() {
  const pricebook = await getCodeCompliancePricebook()

  return (
    <>
      <PageHeader title="NEC Quick Reference" backHref="/settings" />
      <div className="min-h-dvh" style={{paddingTop: "var(--header-h)"}}>
        {/* Dark page header */}
        <div className="bg-[#0d1f3c] px-4 py-3 flex items-center justify-between border-b border-[#1a2f50]">
          <div>
            <div className="text-white font-bold text-base">⚖️ NEC Quick Reference</div>
            <div className="text-gray-500 text-xs mt-0.5">NEC 2023 · Colorado Springs</div>
          </div>
          <div className="bg-green-900/40 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-800">
            PPRBD
          </div>
        </div>

        <NecReference pricebook={pricebook} />
      </div>
    </>
  )
}
