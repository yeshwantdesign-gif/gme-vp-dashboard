'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import { LocaleToggle } from '@/components/shared/locale-toggle'

export function Header({ email }: { email: string }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()

  const navLinks = [
    { href: '/dashboard', labelKey: 'nav.dashboard' },
    { href: '/rulesets', labelKey: 'nav.rulesets' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 glass-card flex items-center justify-between rounded-none border-x-0 border-t-0 px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="dashboard-title text-lg">
          {t('appName')}
        </h1>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-[var(--gme-radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-[var(--surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <LocaleToggle />
        <span className="text-sm text-[var(--text-secondary)]">{email}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-1.5 h-4 w-4" />
          {t('auth.signOut')}
        </Button>
      </div>
    </header>
  )
}
