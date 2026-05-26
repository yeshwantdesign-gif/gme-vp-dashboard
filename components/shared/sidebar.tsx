'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import { LayoutGrid, ListFilter, Upload, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar({ email }: { email: string }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()

  const navLinks = [
    { href: '/dashboard',   labelKey: 'nav.dashboard',   icon: LayoutGrid, match: (p: string) => p === '/dashboard' },
    { href: '/rulesets',    labelKey: 'nav.rulesets',    icon: ListFilter, match: (p: string) => p.startsWith('/rulesets') },
    { href: '/data-upload', labelKey: 'nav.dataUpload',  icon: Upload,     match: (p: string) => p.startsWith('/data-upload') },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] p-5">
      {/* App title */}
      <div className="mb-5 pb-4 border-b border-[var(--border)]">
        <h1 className="dashboard-title text-base leading-tight">{t('appName')}</h1>
        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon
          const active = link.match(pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-[var(--gme-radius-sm)] px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(link.labelKey)}
            </Link>
          )
        })}
      </nav>

      {/* Footer: sign out */}
      <div className="border-t border-[var(--border)] pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-3"
        >
          <LogOut className="h-4 w-4" />
          {t('auth.signOut')}
        </Button>
      </div>
    </aside>
  )
}
