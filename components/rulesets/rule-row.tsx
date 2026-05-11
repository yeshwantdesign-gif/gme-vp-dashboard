import type { Rule } from '@/lib/types'

export function RuleRow({ rule, index }: { rule: Rule; index: number }) {
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr_5rem_5rem_5rem] items-center gap-2 border-b border-[var(--border)] py-2 text-sm last:border-0">
      <span className="text-[var(--text-muted)] tabular-nums">{index + 1}</span>
      <span className="font-medium">{rule.feature}</span>
      <span className="text-[var(--text-secondary)]">{rule.condition}</span>
      <span className="text-right tabular-nums">{(rule.coverage * 100).toFixed(0)}%</span>
      <span className="text-right tabular-nums">{(rule.confidence * 100).toFixed(0)}%</span>
      <span className="text-right tabular-nums font-medium">{rule.priority_score.toFixed(1)}</span>
    </div>
  )
}
