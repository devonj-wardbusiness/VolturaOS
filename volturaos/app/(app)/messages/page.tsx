export const dynamic = 'force-dynamic'

import { listSmsThreads } from '@/lib/actions/messages'
import { MessageInbox } from '@/components/messages/MessageInbox'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function MessagesPage() {
  const threads = await listSmsThreads()
  return (
    <>
      <PageHeader title="Messages" />
      <MessageInbox threads={threads} />
    </>
  )
}
