import { LoadCalcTool } from '@/components/tools/LoadCalcTool'
import { PageHeader } from '@/components/ui/PageHeader'

export default function LoadCalcPage() {
  return (
    <>
      <PageHeader title="Load Calculator" backHref="/settings" />
      <div className="min-h-dvh pt-14 pb-8">
        <LoadCalcTool />
      </div>
    </>
  )
}
