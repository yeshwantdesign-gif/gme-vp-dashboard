import { cn } from '@/lib/utils'

export function ChartCard({
  title,
  children,
  className,
  headerActions,
}: {
  title: string
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
}) {
  return (
    <div className={cn('glass-card', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
      </div>
      {children}
    </div>
  )
}
