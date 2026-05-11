import { cn } from '@/lib/utils'

export function ChartCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('glass-card', className)}>
      <h3 className="mb-4 text-base font-semibold tracking-tight">{title}</h3>
      {children}
    </div>
  )
}
