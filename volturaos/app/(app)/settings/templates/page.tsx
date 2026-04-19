export const dynamic = 'force-dynamic'
import { getTemplates } from '@/lib/actions/estimates'
import { TemplateList } from '@/components/settings/TemplateList'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function TemplatesPage() {
  const templates = await getTemplates()
  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-white font-bold text-xl">Templates</h1>
      </div>
      {templates.length === 0 ? (
        <EmptyState
          message="No templates yet — open any estimate and tap 🔖 to save one"
        />
      ) : (
        <TemplateList templates={templates} />
      )}
    </div>
  )
}
