'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/contexts/locale-context'
import type { Filters } from '@/lib/types'

const triggerClasses =
  'inline-flex items-center justify-start rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-muted hover:text-foreground transition-colors'

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: Date
  onChange: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClasses}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {label}: {format(value, 'yyyy-MM-dd')}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            if (d) {
              onChange(d)
              setOpen(false)
            }
          }}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  )
}

function MultiSelect({
  label,
  options,
  displayFn,
  selected,
  onChange,
  clearLabel,
  searchPlaceholder,
  noResultsLabel,
}: {
  label: string
  options: string[]
  displayFn: (opt: string) => string
  selected: string[]
  onChange: (v: string[]) => void
  clearLabel: string
  searchPlaceholder: string
  noResultsLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  function toggle(val: string) {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val))
    } else {
      onChange([...selected, val])
    }
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(
        (opt) =>
          opt.toLowerCase().includes(q) || displayFn(opt).toLowerCase().includes(q),
      )
    : options

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery('')
      }}
    >
      <PopoverTrigger className={triggerClasses}>
        {label}
        {selected.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            {selected.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-1 w-full rounded border border-[var(--border)] bg-background px-2 py-1.5 text-sm outline-none focus:border-[var(--border-glow)]"
        />
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="mb-1 flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface)]"
          >
            <X className="h-3 w-3" /> {clearLabel}
          </button>
        )}
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-[var(--text-secondary)]">
              {noResultsLabel}
            </div>
          ) : (
            filtered.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--surface)]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded"
                />
                {displayFn(opt)}
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function FilterBar({
  filters,
  onFiltersChange,
  nationalities,
  channels,
  transactionMethods,
}: {
  filters: Filters
  onFiltersChange: (f: Filters) => void
  nationalities: string[]
  channels: string[]
  transactionMethods: string[]
}) {
  const { t, tCountry, tMethodCategory } = useLocale()

  return (
    <div className="sticky top-[57px] z-40 glass-card flex flex-wrap items-center gap-3 rounded-[var(--gme-radius-sm)]">
      <DatePicker
        label={t('dashboard.filters.from')}
        value={new Date(filters.dateFrom)}
        onChange={(d) =>
          onFiltersChange({ ...filters, dateFrom: format(d, 'yyyy-MM-dd') })
        }
      />
      <DatePicker
        label={t('dashboard.filters.to')}
        value={new Date(filters.dateTo)}
        onChange={(d) =>
          onFiltersChange({ ...filters, dateTo: format(d, 'yyyy-MM-dd') })
        }
      />

      <MultiSelect
        label={t('dashboard.filters.nationality')}
        options={nationalities}
        displayFn={tCountry}
        selected={filters.nationalities}
        onChange={(v) => onFiltersChange({ ...filters, nationalities: v })}
        clearLabel={t('dashboard.filters.clearAll')}
        searchPlaceholder={t('dashboard.filters.search')}
        noResultsLabel={t('dashboard.filters.noResults')}
      />

      <MultiSelect
        label={t('dashboard.filters.channel')}
        options={channels}
        displayFn={(c) => c}
        selected={filters.channels}
        onChange={(v) => onFiltersChange({ ...filters, channels: v })}
        clearLabel={t('dashboard.filters.clearAll')}
        searchPlaceholder={t('dashboard.filters.search')}
        noResultsLabel={t('dashboard.filters.noResults')}
      />

      <MultiSelect
        label={t('dashboard.transactionMethod')}
        options={transactionMethods}
        displayFn={tMethodCategory}
        selected={filters.transactionMethods}
        onChange={(v) => onFiltersChange({ ...filters, transactionMethods: v })}
        clearLabel={t('dashboard.filters.clearAll')}
        searchPlaceholder={t('dashboard.filters.search')}
        noResultsLabel={t('dashboard.filters.noResults')}
      />

      <div className="ml-auto flex items-center gap-2 text-sm">
        <span className="text-[var(--text-secondary)]">{t('dashboard.filters.timeBasis')}:</span>
        <button
          onClick={() =>
            onFiltersChange({
              ...filters,
              dateBasis:
                filters.dateBasis === 'report_date'
                  ? 'deposit_date'
                  : 'report_date',
            })
          }
          className="rounded-[var(--gme-radius-sm)] border border-[var(--border)] px-3 py-1.5 font-medium transition-colors hover:border-[var(--border-glow)]"
        >
          {filters.dateBasis === 'report_date'
            ? t('dashboard.filters.reportDate')
            : t('dashboard.filters.depositDate')}
        </button>
      </div>
    </div>
  )
}
