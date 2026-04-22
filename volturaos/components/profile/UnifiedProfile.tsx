'use client'

import { useState } from 'react'
import { ProfileHeader } from './ProfileHeader'
import { ProfileSidebar, type TabId } from './ProfileSidebar'
import { JobTab } from './tabs/JobTab'
import { HistoryTab } from './tabs/HistoryTab'
import { EstimatesTab } from './tabs/EstimatesTab'
import { InvoiceTab } from './tabs/InvoiceTab'
import { FormsTab } from './tabs/FormsTab'
import type { Job, JobChecklist, ChangeOrder, Invoice, EstimateStatus, LineItem, Addon, Form } from '@/types'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: EstimateStatus
  line_items: LineItem[] | null
  addons: Addon[] | null
  created_at: string
}

interface UnifiedProfileProps {
  job: Job & {
    customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null }
  }
  checklist: JobChecklist
  photos: JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  estimates: EstimateSlice[]
  invoices: Invoice[]
  jobHistory: Job[]
  forms: Form[]
}

export function UnifiedProfile({
  job,
  checklist,
  photos,
  signedEstimateId,
  changeOrders,
  estimates,
  invoices,
  jobHistory,
  forms,
}: UnifiedProfileProps) {
  const [activeTab, setActiveTab] = useState<TabId>('job')

  // JobDetail requires zip on customer; getJobWithContext doesn't fetch it.
  // NeighborhoodBlitz already handles zip={null} with an early return, so this is safe.
  const jobWithZip = {
    ...job,
    customer: { ...job.customer, zip: null },
  }

  return (
    <>
      <ProfileHeader
        customerName={job.customer.name}
        customerPhone={job.customer.phone}
        jobType={job.job_type}
        status={job.status}
      />

      {/* Fixed sidebar */}
      <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Scrollable content — offset for fixed header + sidebar */}
      <div className="ml-[60px] pt-14 pb-16 min-h-dvh">
        {activeTab === 'job' && (
          <JobTab
            job={jobWithZip}
            checklist={checklist}
            photos={photos}
            signedEstimateId={signedEstimateId}
            changeOrders={changeOrders}
            customerEstimates={estimates as Array<Pick<import('@/types').Estimate, 'id' | 'name' | 'total' | 'status'>>}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            customer={job.customer}
            jobHistory={jobHistory}
            estimates={estimates}
            invoices={invoices}
          />
        )}
        {activeTab === 'estimates' && (
          <EstimatesTab
            estimates={estimates}
            customerId={job.customer.id}
          />
        )}
        {activeTab === 'invoice' && (
          <InvoiceTab invoices={invoices} customerId={job.customer.id} />
        )}
        {activeTab === 'forms' && (
          <FormsTab
            forms={forms}
            jobId={job.id}
            customerId={job.customer.id}
            customerPhone={job.customer.phone}
          />
        )}
      </div>
    </>
  )
}
