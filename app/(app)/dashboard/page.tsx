import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch distinct filter options server-side (small, cacheable queries)
  const [{ data: natRows }, { data: chanRows }, { data: methodRows }] = await Promise.all([
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
    supabase
      .from('phishing_reports')
      .select('transaction_method')
      .order('transaction_method')
      .range(0, 9999),
  ])

  const nationalities = [...new Set((natRows ?? []).map((r) => r.sender_nationality as string))].filter(Boolean)
  const channels = [...new Set((chanRows ?? []).map((r) => r.deposit_channel as string))].filter(Boolean)
  const transactionMethods = [...new Set((methodRows ?? []).map((r) => r.transaction_method as string))].filter(Boolean)

  return (
    <DashboardShell
      nationalities={nationalities}
      channels={channels}
      transactionMethods={transactionMethods}
    />
  )
}
