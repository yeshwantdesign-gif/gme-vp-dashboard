'use client'

import { useRef, useState } from 'react'
import { Upload as UploadIcon, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { cn } from '@/lib/utils'

interface UploadResult {
  ok?: boolean
  processed?: number
  inserted?: number
  skipped?: number
  warnings?: string[]
  error?: string
}

export default function DataUploadPage() {
  const { t } = useLocale()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null) }
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); setResult(null) }
  }

  async function handleUpload() {
    if (!file) {
      setResult({ error: t('dataUpload.noFileSelected') })
      return
    }
    setBusy(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-phishing', { method: 'POST', body: fd })
      const json = await res.json() as UploadResult
      if (!res.ok) {
        setResult({ error: json.error ?? t('dataUpload.genericError') })
      } else {
        setResult(json)
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : t('dataUpload.genericError') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="dashboard-title text-3xl">{t('dataUpload.title')}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t('dataUpload.subtitle')}
        </p>
      </div>

      <div className="glass-card">
        <div className="mx-auto max-w-2xl space-y-5">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {t('dataUpload.uploadLabel')}
          </label>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-[var(--gme-radius)] border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragOver ? 'bg-[var(--surface)]' : 'border-[var(--border)] hover:bg-[var(--surface)]',
            )}
            style={dragOver ? { borderColor: 'var(--accent-blue)' } : undefined}
          >
            <UploadIcon className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
              {file?.name ?? t('dataUpload.dropHint')}
            </p>
            {file && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={onPick}
              className="hidden"
            />
          </div>

          {/* Process button */}
          <button
            onClick={handleUpload}
            disabled={busy || !file}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--gme-radius-sm)] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent-blue)' }}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('dataUpload.processing')}
              </>
            ) : (
              t('dataUpload.processButton')
            )}
          </button>

          {/* Status / result */}
          {result && <ResultBanner result={result} t={t} />}
        </div>
      </div>
    </div>
  )
}

function ResultBanner({
  result, t,
}: {
  result: UploadResult
  t: (k: string, v?: Record<string, string | number>) => string
}) {
  if (result.error) {
    return (
      <div className="rounded-[var(--gme-radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {result.error}
      </div>
    )
  }
  const inserted = result.inserted ?? 0
  const skipped = result.skipped ?? 0
  return (
    <div className="space-y-2">
      <div className="rounded-[var(--gme-radius-sm)] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        {inserted > 0
          ? t('dataUpload.successInserted', { count: inserted })
          : t('dataUpload.noNewRecords')}
      </div>
      {skipped > 0 && (
        <div className="rounded-[var(--gme-radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--text-secondary)]">
          {t('dataUpload.successSkipped', {
            processed: result.processed ?? 0,
            skipped,
          })}
        </div>
      )}
      {result.warnings && result.warnings.length > 0 && (
        <div className="rounded-[var(--gme-radius-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <div className="mb-1 font-medium">{t('dataUpload.warningsHeading')}</div>
          <ul className="space-y-0.5 pl-3">
            {result.warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
