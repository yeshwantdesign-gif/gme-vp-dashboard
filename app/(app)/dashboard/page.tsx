import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { METHOD_CATEGORY_IDS } from '@/lib/method-categories'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch distinct filter options server-side (small, cacheable queries)
  const [{ data: natRows }, { data: chanRows }] = await Promise.all([
    supabase
      .from('phishing_reports')
      .select('sender_nationality')
      .order('sender_nationality')
      .range(0, 9999),
    supabase
      .from('phishing_reports')
      .select('deposit_channel')
      .order('deposit_channel')
      .range(0, 9999),
  ])

  const nationalities = [...new Set((natRows ?? []).map((r) => r.sender_nationality as string))].filter(Boolean)
  const channels = [...new Set((chanRows ?? []).map((r) => r.deposit_channel as string))].filter(Boolean)
  const transactionMethods = [...METHOD_CATEGORY_IDS]

  return (
    <DashboardShell
      nationalities={nationalities}
      channels={channels}
      transactionMethods={transactionMethods}
    />
  )
}
