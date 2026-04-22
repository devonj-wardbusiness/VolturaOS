'use client'

import { useState, useTransition } from 'react'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { createOrGetForm, deleteForm } from '@/lib/actions/forms'
import { MaterialListSheet } from '@/components/forms/MaterialListSheet'
import { SignedFormSheet } from '@/components/forms/SignedFormSheet'
import type { Form, FormType } from '@/types'

const FORM_DEFS: { type: FormType; label: string; icon: string }[] = [
  { type: 'material_list', label: 'Material List', icon: '📋' },
  { type: 'permission_to_cut', label: 'Permission to Cut', icon: '✂️' },
  { type: 'safety_waiver', label: 'Safety Waiver', icon: '⚠️' },
]

interface FormsTabProps {
  forms: Form[]
  jobId: string
  customerId: string
  customerPhone: string | null
}

export function FormsTab({ forms: initialForms, jobId, customerId, customerPhone }: FormsTabProps) {
  const [forms, setForms] = useState<Form[]>(initialForms)
  const [openForm, setOpenForm] = useState<Form | null>(null)
  const [, startTransition] = useTransition()
  const { openSheet } = useActionSheet()

  function getForm(type: FormType): Form | null {
    return forms.find(f => f.form_type === type) ?? null
  }

  function handleOpen(type: FormType) {
    const existing = getForm(type)
    if (existing) { setOpenForm(existing); return }
    startTransition(async () => {
      const form = await createOrGetForm(jobId, customerId, type)
      setForms(prev => [...prev, form])
      setOpenForm(form)
    })
  }

  function handleDelete(form: Form) {
    openSheet(form.form_type.replace(/_/g, ' '), [
      {
        icon: '🗑️',
        label: 'Delete',
        destructive: true,
        onClick: () => {
          startTransition(async () => {
            await deleteForm(form.id)
            setForms(prev => prev.filter(f => f.id !== form.id))
          })
        },
      },
    ])
  }

  return (
    <div className="p-4 space-y-3">
      {FORM_DEFS.map(({ type, label, icon }) => {
        const form = getForm(type)
        return (
          <FormCard
            key={type}
            icon={icon}
            label={label}
            form={form}
            onOpen={() => handleOpen(type)}
            onLongPress={form ? () => handleDelete(form) : undefined}
          />
        )
      })}

      {openForm?.form_type === 'material_list' && (
        <MaterialListSheet
          form={openForm}
          onClose={() => setOpenForm(null)}
          onSave={(items) =>
            setForms(prev =>
              prev.map(f => f.id === openForm.id ? { ...f, line_items: items } : f)
            )
          }
        />
      )}

      {openForm && openForm.form_type !== 'material_list' && (
        <SignedFormSheet
          form={openForm}
          customerPhone={customerPhone}
          onClose={() => setOpenForm(null)}
          onSigned={(updated) => {
            setForms(prev => prev.map(f => f.id === updated.id ? updated : f))
            setOpenForm(updated)
          }}
        />
      )}
    </div>
  )
}

function FormCard({
  icon,
  label,
  form,
  onOpen,
  onLongPress,
}: {
  icon: string
  label: string
  form: Form | null
  onOpen: () => void
  onLongPress?: () => void
}) {
  const longPress = useLongPress(onLongPress ?? (() => {}))

  const statusText = !form
    ? 'Tap + to create'
    : form.status === 'Approved'
    ? '✅ Signed'
    : 'Draft'

  return (
    <div
      {...longPress}
      onClick={onOpen}
      className="flex items-center justify-between bg-volturaNavy rounded-xl px-4 py-4 cursor-pointer active:opacity-70"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className={`text-sm ${form?.status === 'Approved' ? 'text-green-400' : 'text-gray-500'}`}>
            {statusText}
          </p>
        </div>
      </div>
      <span className="text-volturaGold text-xl font-light">+</span>
    </div>
  )
}
