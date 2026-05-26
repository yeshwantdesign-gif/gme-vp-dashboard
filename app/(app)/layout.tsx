import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/sidebar'
import { LocaleToggle } from '@/components/shared/locale-toggle'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user.email ?? ''} />
      <div className="flex-1">
        <div className="sticky top-0 z-40 flex justify-end border-b border-[var(--border)] bg-[var(--bg-secondary)]/80 px-6 py-2 backdrop-blur">
          <LocaleToggle />
        </div>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
