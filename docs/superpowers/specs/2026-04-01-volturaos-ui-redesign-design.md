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

Update `tailwind.config.ts` theme extension to these new values. All existing `bg-volturaBlue`, `bg-volturaNavy`, `text-volturaGold` class usage across the app automatically picks up the new colors with no further changes.

Add one new utility class: `border-white/5` — used on all card borders.

---

## Dependency

Install `lucide-react` (SVG icon library). Version: latest. No other new dependencies.

---

## Component 1: PageHeader

New shared component `volturaos/components/ui/PageHeader.tsx`.

**Props:**
```typescript
interface PageHeaderProps {
  title: string
  backHref?: string      // if set, shows chevron-left back button
  action?: React.ReactNode  // optional right-side button/element
}
```

**Behavior:**
- Fixed to top of screen (`fixed top-0 left-0 right-0 z-40`)
- Height: `h-14`
- Background: `bg-[#0D0F1A]/90` with `backdrop-blur-sm`
- Bottom border: `border-b border-white/5`
- Title: centered, white, `text-sm font-semibold tracking-wide`
- Back button (left): `<ChevronLeft>` from lucide-react, `text-volturaGold`, navigates to `backHref`
- Action (right): arbitrary slot — typically a gold text button

**Usage:** Replace the inline `<header>` blocks on every list page and detail page with `<PageHeader>`. List pages (no back) set only `title`. Detail pages set `title` + `backHref`. Pages with a primary action (e.g., "+ New") pass it as `action`.

**Body offset:** Every page using PageHeader must add `pt-14` to its outermost container to clear the fixed header.

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
- Container: `fixed bottom-0`, `h-16`, `bg-[#0D0F1A]/95 backdrop-blur-sm`, `border-t border-white/5`
- Each tab: flex column, icon + label stacked, label `text-[10px]`
- Active: gold pill + gold icon + gold label (`text-volturaGold`)
- Inactive: `text-gray-500`
- Icon size: `20px` (w-5 h-5)

---

## Component 3: Card Style Update

No new component — update the card visual language in place across list pages.

**Card spec:**
- Background: `bg-[#161B2E]` (already volturaNavy, but token updates automatically)
- Border: add `border border-white/5`
- Radius: `rounded-2xl` (upgrade from `rounded-xl`)
- Press feedback: `active:scale-[0.98] transition-transform duration-100`
- Internal padding: keep existing — typically `p-4`

Apply to: customer cards, job cards, estimate group cards, invoice cards, dashboard KPI cards.

---

## Status Pills

Standardize status colors across estimates, jobs, and invoices. All pills: `rounded-full px-2 py-0.5 text-xs font-medium`.

| Status | Background | Text |
|--------|-----------|------|
| Draft | `bg-gray-800` | `text-gray-400` |
| Sent | `bg-blue-900/50` | `text-blue-300` |
| Viewed | `bg-indigo-900/50` | `text-indigo-300` |
| Approved | `bg-emerald-900/50` | `text-emerald-300` |
| Declined | `bg-red-900/50` | `text-red-300` |
| In Progress | `bg-amber-900/50` | `text-amber-300` |
| Completed | `bg-green-900/50` | `text-green-300` |
| Invoiced | `bg-purple-900/50` | `text-purple-300` |
| Paid | `bg-teal-900/50` | `text-teal-300` |
| Overdue | `bg-red-900/60` | `text-red-300` |
| Active (agreement) | `bg-emerald-900/50` | `text-emerald-300` |
| Cancelled | `bg-gray-800` | `text-gray-400` |
| Expired | `bg-red-900/50` | `text-red-300` |

Create a shared helper `volturaos/lib/statusColor.ts` that returns the two class strings given a status string, so the mapping is defined once.

---

## Dashboard Updates

- Replace inline `<header>` with `<PageHeader title="VOLTURA" />` — no back button, no action
- KPI cards: apply card border (`border border-white/5`) and `rounded-2xl`
- Quick action buttons: `rounded-2xl`, gold border instead of solid gold background — `border border-volturaGold text-volturaGold bg-transparent`

---

## List Pages

Apply to `/customers`, `/jobs`, `/estimates`, `/invoices`:
- Replace inline header with `<PageHeader title="[Page Name]" action={<Link href="...">+ New</Link>} />`
- Add `pt-14` to page container
- Card border + `rounded-2xl` + `active:scale-[0.98]`
- Status pills use shared `statusColor` helper

---

## Detail Pages

Apply to customer detail, job detail, estimate builder, invoice detail:
- Replace inline header with `<PageHeader title="[name or type]" backHref="/[list-route]" action={...} />`
- Add `pt-14`
- Section dividers: `border-t border-white/5` instead of heavy lines

---

## Build Order

1. Install `lucide-react`
2. Update color tokens in `tailwind.config.ts`
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
- No font changes (keep system font stack)
