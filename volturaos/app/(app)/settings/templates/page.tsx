export const dynamic = 'force-dynamic'
import { getTemplates, deleteTemplate } from '@/lib/actions/estimates'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

async function handleDelete(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  await deleteTemplate(id)
  revalidatePath('/settings/templates')
}

export default async function TemplatesPage() {
  const templates = await getTemplates()
  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-white font-bold text-xl">Templates</h1>
        <Link href="/settings/pricebook" className="text-gray-500 text-sm">← Pricebook</Link>
      </div>
      {templates.length === 0 ? (
        <p className="text-gray-500 text-sm">No templates yet. Save an estimate as a template to reuse it.</p>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-volturaNavy rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{t.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t.line_items?.length ?? 0} items · ${(t.total ?? 0).toLocaleString()}
                </p>
              </div>
              <form action={handleDelete}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="text-red-400 text-xs px-3 py-1">Delete</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
