import type { Job, JobChecklist, ChangeOrder, Estimate, HomeInspection } from '@/types'
import { JobDetail } from '@/components/jobs/JobDetail'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

interface JobTabProps {
  job: Job & { customer: { id: string; name: string; phone: string | null; address: string | null; zip: string | null } }
  checklist: JobChecklist
  photos: JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  customerEstimates: Array<Pick<Estimate, 'id' | 'name' | 'total' | 'status'>>
  inspections: HomeInspection[]
}

export function JobTab(props: JobTabProps) {
  return <JobDetail {...props} />
}
