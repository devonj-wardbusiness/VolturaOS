// Phase 1 stub — real implementation in Phase 3
// Server-only: never import from client components

export type SheetsTab = 'Jobs' | 'Estimates' | 'Invoices' | 'Customers'

export async function syncToSheets(_tab: SheetsTab, _data: Record<string, unknown>): Promise<void> {
  // no-op in Phase 1
}
