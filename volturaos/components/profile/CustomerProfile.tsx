'use client'

import { useState } from 'react'
import { CustomerHeader } from './CustomerHeader'
import { CustomerSidebar, type CustomerTabId } from './CustomerSidebar'
import { HistoryTab } from './tabs/HistoryTab'
import { EstimatesTab } from './tabs/EstimatesTab'
import { InvoiceTab } from './tabs/InvoiceTab'
import { CustomerDetail } from '@/components/customers/CustomerDetail'
import { EquipmentSection } from '@/components/customers/EquipmentSection'
import type { Customer, CustomerEquipment, MaintenanceAgreement, Job, Invoice, EstimateStatus, LineItem, Addon } from '@/types'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: EstimateStatus
  line_items: LineItem[] | null
  addons: Addon[] | null
  created_at: string
}

interface CustomerProfileProps {
  customer: Customer & { equipment: CustomerEquipment[] }
  agreement: MaintenanceAgreement | null
  jobs: Job[]
  estimates: EstimateSlice[]
  invoices: Invoice[]
}

export function CustomerProfile({ customer, agreement, jobs, estimates, invoices }: CustomerProfileProps) {
  const [activeTab, setActiveTab] = useState<CustomerTabId>('overview')

  return (
    <>
      <CustomerHeader customer={customer} />
      <CustomerSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div
        className="ml-[60px] md:ml-[72px] min-h-dvh"
        style={{ paddingTop: 'var(--header-h)', paddingBottom: 'var(--nav-h)' }}
      >
        {activeTab === 'overview' && (
          <div className="px-4 pt-4 pb-6 space-y-4">
            <CustomerDetail customer={customer} agreement={agreement} />
            <EquipmentSection customerId={customer.id} equipment={customer.equipment} />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab
            customer={customer}
            jobHistory={jobs}
            estimates={estimates}
            invoices={invoices}
          />
        )}

        {activeTab === 'estimates' && (
          <EstimatesTab estimates={estimates} customerId={customer.id} />
        )}

        {activeTab === 'invoice' && (
          <InvoiceTab invoices={invoices} customerId={customer.id} />
        )}
      </div>
    </>
  )
}
