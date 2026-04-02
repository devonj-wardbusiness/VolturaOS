# VolturaOS UI Professional Redesign
**Date:** 2026-04-01
**Status:** Approved for implementation

---

## Overview

A full-app visual polish pass to make VolturaOS feel premium and professional — on par with best-in-class field service apps. The changes are purely presentational: same routes, same data, same actions. No new features, no schema changes.

---

## Color System

| Token | Current | New | Usage |
|-------|---------|-----|-------|
| `volturaBlue` | `#1A1F6E` | `#0D0F1A` | Page background (near-black) |
| `volturaNavy` | `#2E4BA0` | `#161B2E` | Card/surface background |
| `volturaGold` | `#C9A227` | `#D4AF37` | Primary accent, active states |

**How to update:** Edit `volturaos/app/globals.css` — the project uses Tailwind CSS v4 (CSS-first, no `tailwind.config.ts`). Update the `@theme inline` block:

```css
@theme inline {
  --color-volturaBlue: #0D0F1A;
  --color-volturaNavy: #161B2E;
  --color-volturaGold: #D4AF37;
  --color-background: #0D0F1A;
  --color-foreground: #f1f5f9;
  --color-surface: #161B2E;
  --font-sans: 'Inter', sans-serif;
}
```

Also update the `html` rule at the bottom of globals.css: `background-color: #0D0F1A;`

All existing `bg-volturaBlue`, `bg-volturaNavy`, `text-volturaGold` class usage across the app automatically picks up the new colors with no further changes.

**Font:** Keep `Inter` as-is — no font changes.

**`border-white/5`:** This is a standard Tailwind v4 generated utility (white at 5% opacity) — no configuration step needed, use it directly in JSX.

---

## Dependency

Install `lucide-react` (SVG icon library). Version: latest. No other new dependencies.

---

## Component 1: PageHeader

New shared component `volturaos/components/ui/PageHeader.tsx`.

Add `'use client'` at the top — the component contains interactive elements (back button click, arbitrary action slot which may include client-side buttons).

**Props:**
```typescript
interface PageHeaderProps {
  title: string
  subtitle?: string      // optional second line below title (smaller, muted)
  backHref?: string      // if set, shows chevron-left back button as a plain <Link>
  action?: React.ReactNode  // optional right-side slot — typically a gold text button or Link
}
```

**Behavior:**
- Fixed to top of screen (`fixed top-0 left-0 right-0 z-50`)
- Height: `h-14`
- Background: `bg-[#0D0F1A]/90 backdrop-blur-sm`
- Bottom border: `border-b border-white/5`
- Title: centered, white, `text-sm font-semibold tracking-wide`
- Subtitle (if provided): centered below title, `text-[10px] text-gray-400`
- Back button (left): `<Link href={backHref}>` containing `<ChevronLeft size={20} className="text-volturaGold" />` — plain Next.js Link, no JS navigation
- Action (right): arbitrary slot — position absolute right, `pr-4`

**Usage:** Replace the inline `<header>` blocks on every list page and detail page with `<PageHeader>`. List pages set only `title`. Detail pages set `title` + `backHref`. Pages with a primary action pass it as `action`. Dashboard page passes `title="VOLTURA" subtitle="Power Group"` — this replaces the two-line header currently rendered there.

**Body offset:** Every page using PageHeader must **replace existing `pt-6`** with `pt-14` on its outermost container to clear the fixed header.

---

## Component 2: BottomNav Redesign

Redesign `volturaos/components/nav/BottomNav.tsx`.

**Icons** (from lucide-react, replacing emoji):
| Tab | Icon | Label |
|-----|------|-------|
| Dashboard | `Zap` | Home |
| Jobs | `Wrench` | Jobs |
| Customers | `Users` | Customers |
| Estimates | `FileText` | Estimates |
| Invoices | `DollarSign` | Invoices |

**Active indicator:** Gold pill above the icon (`w-8 h-1 rounded-full bg-volturaGold`), not a background highlight.

**Layout:**
- Container: `fixed bottom-0 left-0 right-0 z-40`, `h-16`, `bg-[#0D0F1A]/95 backdrop-blur-sm`, `border-t border-white/5`
- Each tab: flex column (items-center justify-center), gold pill + icon + label stacked
- Active: gold pill visible + `text-volturaGold` icon + `text-volturaGold` label
- Inactive: pill hidden (or `opacity-0`) + `text-gray-500` icon + `text-gray-500` label
- Icon size: `w-5 h-5`
- Label: `text-[10px]`

**Z-index note:** BottomNav uses `z-40`, PageHeader uses `z-50`. These are different stacking layers — no conflict.

---

## Component 3: Card Style Update

No new component — update the card visual language in place across list pages.

**Card spec:**
- Background: `bg-volturaNavy` (token update in globals.css makes this `#161B2E` automatically)
- Border: add `border border-white/5`
- Radius: `rounded-2xl` (upgrade from `rounded-xl`)
- Press feedback: `active:scale-[0.98] transition-transform duration-100`
  - Note: this Tailwind class works correctly on server-rendered `<Link>` elements — no client component conversion needed
- Internal padding: keep existing — typically `p-4`

Apply to: customer cards, job cards, estimate group cards, invoice cards, dashboard KPI cards.

---

## Status Pills

Standardize status colors across estimates, jobs, and invoices. All pills: `rounded-full px-2 py-0.5 text-xs font-medium`.

Covers all values from `JobStatus`, `EstimateStatus`, and `InvoiceStatus` in `types/index.ts`, plus maintenance agreement statuses from Phase 4:

| Status | Background | Text |
|--------|-----------|------|
| Draft | `bg-gray-800` | `text-gray-400` |
| Sent | `bg-blue-900/50` | `text-blue-300` |
| Viewed | `bg-indigo-900/50` | `text-indigo-300` |
| Approved | `bg-emerald-900/50` | `text-emerald-300` |
| Declined | `bg-red-900/50` | `text-red-300` |
| Lead | `bg-gray-700` | `text-gray-300` |
| Scheduled | `bg-sky-900/50` | `text-sky-300` |
| In Progress | `bg-amber-900/50` | `text-amber-300` |
| Completed | `bg-green-900/50` | `text-green-300` |
| Invoiced | `bg-purple-900/50` | `text-purple-300` |
| Unpaid | `bg-orange-900/50` | `text-orange-300` |
| Partial | `bg-yellow-900/50` | `text-yellow-300` |
| Paid | `bg-teal-900/50` | `text-teal-300` |
| Cancelled | `bg-gray-800` | `text-gray-400` |
| Active | `bg-emerald-900/50` | `text-emerald-300` |
| Expired | `bg-red-900/50` | `text-red-300` |

Create a shared helper `volturaos/lib/statusColor.ts` that accepts a status string and returns `{ bg: string, text: string }` with the two Tailwind class strings. Returns neutral gray classes for any unrecognized status.

---

## Dashboard Updates

- Replace the existing two-line `<header>` block with `<PageHeader title="VOLTURA" subtitle="Power Group" />` — no back button, no action
- Replace `pt-6` with `pt-14` on the outermost container div
- KPI cards: add `border border-white/5` and change `rounded-xl` to `rounded-2xl`
- Quick action buttons: change `bg-volturaNavy rounded-xl` to `bg-transparent border border-volturaGold rounded-2xl` — keep `text-volturaGold font-bold text-sm` and `p-3 text-center`

---

## List Pages

Apply to `/customers`, `/jobs`, `/estimates`, `/invoices`:
- Replace inline header with `<PageHeader title="[Page Name]" action={...} />`
  - Customers: `action={<Link href="/customers/new" className="text-volturaGold text-sm pr-4">+ New</Link>}`
  - Jobs: `action={<Link href="/jobs/new" className="text-volturaGold text-sm pr-4">+ New</Link>}`
  - Estimates: `action={<Link href="/estimates/new" className="text-volturaGold text-sm pr-4">+ New</Link>}`
  - Invoices: no `action` prop (no `/invoices/new` route exists — invoices are created from estimates)
- Replace `pt-6` with `pt-14` on the outermost container
- Card border `border border-white/5` + `rounded-2xl` + `active:scale-[0.98] transition-transform duration-100`
- Status pills use `statusColor` helper

---

## Detail Pages

Apply to customer detail, job detail, estimate builder, invoice detail:
- Replace inline header with `<PageHeader title="[name or type]" backHref="/[list-route]" action={...} />`
- Replace `pt-6` with `pt-14` on the outermost container
- Section dividers: use `border-t border-white/5` instead of heavier dividers where present

---

## Build Order

1. Install `lucide-react`
2. Update color tokens and `html` background in `globals.css`
3. Create `statusColor.ts` helper
4. Create `PageHeader` component
5. Redesign `BottomNav`
6. Update Dashboard page
7. Update list pages (customers, jobs, estimates, invoices)
8. Update detail pages (customer, job, estimate builder, invoice)

---

## Out of Scope

- No route changes
- No data model changes
- No new features
- No animation beyond `active:scale-[0.98]`
- No font changes (keep Inter)
