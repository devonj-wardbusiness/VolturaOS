# Estimate Templates — Design Spec
Date: 2026-04-17  
Status: Approved by user

---

## Overview

Add reusable estimate templates to VolturaOS. Templates are named bundles of line items (same shape as `estimates.line_items`) that speed up estimate creation for common job types like panel upgrades, EV charger installs, and service calls.

---

## User Flows

### Flow 1 — New Estimate with Template Picker
When the user taps **+ New Estimate**, before opening the builder they see a template picker screen:

- Lists all saved templates: name, item count, total price
- Tapping a template loads its line items into the new estimate and opens the builder
- **"+ Start Blank"** option at the bottom skips templates entirely
- If no templates exist yet, skip straight to blank builder (no empty picker shown)

### Flow 2 — Save as Template from Existing Estimate
A **"📋 Save as Template"** button appears in the estimate builder alongside Duplicate and Delete (top-right area). Tapping it:

1. Prompts for a template name (pre-filled with the estimate name)
2. Saves all current `line_items` as a new template
3. Shows a brief success toast

### Flow 3 — Manage Templates in Settings
**Settings → Estimate Templates** section:

- Lists all templates with name, item count, total
- **+ New** button: opens a template editor (name field + pricebook search to add line items — same LineItemSearch component used in the builder)
- Each template has **Edit** (rename + add/remove items) and **Delete** (inline confirmation)

### Mid-Estimate Load (Replace vs Append)
If the user accesses templates while an estimate already has items (future enhancement — not in this release), a confirmation sheet asks: "Replace current items or add to them?" This is deferred; the primary entry point (new estimate picker) always loads into a clean estimate.

---

## Data Model

### New table: `estimate_templates`

```sql
CREATE TABLE estimate_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  line_items  JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

- `line_items` uses the identical JSON shape as `estimates.line_items` — no new types needed
- No `tenant_id` for now (single-tenant); add during SaaS migration
- No `active` flag needed; all templates are always available

---

## Architecture

### Server Actions — `lib/actions/estimate-templates.ts`
```
listTemplates()           → EstimateTemplate[]
createTemplate(name, lineItems) → EstimateTemplate
updateTemplate(id, name, lineItems) → void
deleteTemplate(id)        → void
```

### New Components
| Component | Location | Purpose |
|---|---|---|
| `TemplatePickerSheet` | `components/estimate-builder/` | Bottom sheet listing templates, shown before new estimate opens |
| `EstimateTemplateManager` | `components/settings/` | CRUD list in Settings page |
| `TemplateEditorSheet` | `components/settings/` | Name + line item editor for create/edit |

### Modified Files
| File | Change |
|---|---|
| `app/(app)/estimates/new/page.tsx` | Show `TemplatePickerSheet` if templates exist; pass selected line items to builder |
| `components/estimate-builder/EstimateBuilder.tsx` | Add "Save as Template" button near Duplicate/Delete; accept `initialLineItems` prop from template picker |
| `app/(app)/settings/page.tsx` | Add Estimate Templates section with `EstimateTemplateManager` |
| `lib/actions/pricebook.ts` | No change — `LineItemSearch` component reused as-is in template editor |

### Types — `types/index.ts`
```typescript
export interface EstimateTemplate {
  id: string
  name: string
  line_items: LineItem[]
  created_at: string
}
```

---

## UI Details

### Template Picker (new estimate flow)
- Dark card per template: gold name, gray "N items · $total"
- Tapping a template navigates to `/estimates/new?customerId=...` with template line items passed via state or URL (prefer state to avoid URL length issues)
- "Start Blank" is a dashed-border card at the bottom
- If 0 templates exist: skip picker entirely, go straight to blank builder

### Save as Template button
- Placed in the row with Duplicate and Delete (top-right of estimate name area)
- Gold border/text to distinguish from destructive Delete
- On tap: modal with name input pre-filled from estimate name → Save

### Settings section
- Sits below Pricebook in Settings
- Long-press or swipe reveals Delete with inline confirmation ("Delete template?")
- Edit opens `TemplateEditorSheet` — name field at top, then line item list with remove buttons, then pricebook search to add more

---

## Out of Scope (this release)
- Mid-estimate template loading (replace/append) — deferred
- Template categories or tags
- Sharing templates between tenants (SaaS)
- Template usage count tracking

---

## Success Criteria
- User can save any estimate as a template in 2 taps
- User can start a new estimate from a template in 1 tap from the picker
- Templates persist in Supabase across sessions
- Settings page shows full CRUD for templates
- No regressions to existing estimate creation flow
