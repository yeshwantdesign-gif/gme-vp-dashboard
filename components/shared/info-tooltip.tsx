import { Info } from 'lucide-react'

export function InfoTooltip({
  text,
  ariaLabel,
}: {
  text: string
  ariaLabel?: string
}) {
  return (
    <span className="group relative inline-flex items-center">
      <Info
        className="h-3.5 w-3.5 cursor-help text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        aria-label={ariaLabel ?? 'More info'}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-[var(--gme-radius-sm)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs leading-relaxed text-[var(--text-primary)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
