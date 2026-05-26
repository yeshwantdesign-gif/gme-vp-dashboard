// SHA-256 row hash (port of gme-vp-analyze/database_manager.py:get_row_hash)
// and dedupe helper.

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Row } from './preprocess'

// Key columns that define a unique transaction. Matches gme-vp-analyze.
const HASH_COLS = [
  'Date of Voice Phishing Report',
  'Sender Name',
  'Deposit AMT (KRW)',
  'Receiver Name',
  'Receiver Country',
  'Remittance Time (24)',
  'Original_Index',
]

export function rowHash(row: Row): string {
  let combined = ''
  for (const col of HASH_COLS) {
    const v = row[col]
    combined += (v == null ? '' : String(v).trim())
  }
  return createHash('sha256').update(combined, 'utf-8').digest('hex')
}

/** Add row_hash to every row. Mutates in place for performance. */
export function annotateHashes(rows: Row[]): void {
  for (const r of rows) r.row_hash = rowHash(r)
}

/**
 * Returns the subset of rows whose row_hash is not already in the DB.
 * Also dedupes within the input batch (keeps the first occurrence of any
 * repeated hash).
 */
export async function filterNewRows<T extends { row_hash?: string }>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  const hashes = [...new Set(rows.map((r) => r.row_hash).filter((h): h is string => !!h))]
  if (hashes.length === 0) return rows

  // Supabase has a 1000-element IN limit, chunk if needed
  const existing = new Set<string>()
  const CHUNK = 1000
  for (let i = 0; i < hashes.length; i += CHUNK) {
    const slice = hashes.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('phishing_reports')
      .select('row_hash')
      .in('row_hash', slice)
    if (error) throw error
    for (const r of data ?? []) {
      if (r.row_hash) existing.add(r.row_hash as string)
    }
  }

  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    const h = r.row_hash
    if (!h) continue
    if (existing.has(h)) continue
    if (seen.has(h)) continue
    seen.add(h)
    out.push(r)
  }
  return out
}
