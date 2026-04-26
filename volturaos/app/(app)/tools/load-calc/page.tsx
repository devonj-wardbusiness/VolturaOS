export const dynamic = 'force-dynamic'

import { LoadCalcTool } from '@/components/tools/LoadCalcTool'
import { PageHeader } from '@/components/ui/PageHeader'

export default function LoadCalcPage() {
  return (
    <>
      <PageHeader title="Load Calculator" backHref="/settings" />
      <div className="min-h-dvh pb-8" style={{paddingTop: "var(--header-h)"}}>
        <LoadCalcTool />
      </div>
    </>
  )
}
