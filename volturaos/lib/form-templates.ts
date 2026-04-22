// lib/form-templates.ts
// Note: material_list is intentionally absent — it has no boilerplate text

export const FORM_TEMPLATES: Record<string, { title: string; body: string }> = {
  permission_to_cut: {
    title: 'Permission to Cut',
    body: `I, the undersigned, hereby grant Voltura Power Group permission to cut into walls, ceilings, floors, or other surfaces as necessary to complete the electrical work described in the associated estimate or work order. I understand that Voltura Power Group will take reasonable care to minimize damage and that any patching or cosmetic repair is not included unless separately quoted.`,
  },
  safety_waiver: {
    title: 'Safety Waiver',
    body: `I, the undersigned, acknowledge that electrical work carries inherent risks. I agree that Voltura Power Group has explained the scope of work and any associated safety considerations. I release Voltura Power Group from liability for pre-existing conditions, concealed hazards, or damage resulting from circumstances outside their control. I confirm that I am the property owner or authorized representative with authority to approve this work.`,
  },
}
