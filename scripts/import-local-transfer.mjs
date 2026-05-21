#!/usr/bin/env node
// Parses the monthly local (domestic) transfer "Matrix Report" PDFs into one
// SQL file you can paste into the Supabase SQL editor.
//
// Run:
//   node scripts/import-local-transfer.mjs
// Outputs:
//   _seed/05_local_transfer.sql

import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const PDF_DIR = 'Local Transfer Report'
const OUT_FILE = '_seed/05_local_transfer.sql'

const FILENAME_TO_MONTH = {
  'Nov-2025':   '2025-11',
  'Dec-2025':   '2025-12',
  'Jan-2026':   '2026-01',
  'Feb-2026':   '2026-02',
  'March-2026': '2026-03',
  'April-2026': '2026-04',
  'May-2026':   '2026-05',
}

// PDF country name → dashboard nationality name (same map as overseas)
const COUNTRY_NORMALIZE = {
  'South Korea': 'Korea',
  'Russian Federation': 'Russia',
  'United kingdom': 'United Kingdom',
}

function fileToMonth(fname) {
  const stem = basename(fname, '.pdf').replace('Local-Transfer-', '')
  const norm = stem.replace(/[\s-]/g, '').toLowerCase()
  for (const [key, val] of Object.entries(FILENAME_TO_MONTH)) {
    if (key.replace(/[\s-]/g, '').toLowerCase() === norm) return val
  }
  return null
}

function normalize(name) {
  return COUNTRY_NORMALIZE[name] ?? name
}

function parsePdf(path) {
  const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf-8' })
  const rows = []
  // Each row: "   CountryName     12,345,678     1234     0"
  // (the trailing "0" is a placeholder column we ignore)
  const re = /^\s+([^\d][^\n]*?)\s+([\d,]+)\s+(\d+)\s+0\s*$/gm
  let m
  while ((m = re.exec(text))) {
    const [, rawName, rawAmt, rawCnt] = m
    const name = rawName.trim()
    // Skip header rows, page footers, and the TOTAL summary
    if (
      !name ||
      /total/i.test(name) ||
      /countryname/i.test(name) ||
      name.includes('gmeremit')
    ) continue
    rows.push({
      country: normalize(name),
      sourceCountry: name,
      totalAmountKrw: Number(rawAmt.replace(/,/g, '')),
      totalTxn: parseInt(rawCnt, 10),
    })
  }
  return rows
}

function sqlString(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

function main() {
  const pdfs = readdirSync(PDF_DIR).filter((f) => f.endsWith('.pdf')).sort()
  const out = []

  out.push('-- ──────────────────────────────────────────────────────────────')
  out.push('-- Auto-generated from monthly local-transfer (Matrix Report) PDFs.')
  out.push('-- Run this in the Supabase SQL editor (any number of times — upserts).')
  out.push('-- ──────────────────────────────────────────────────────────────')
  out.push('')
  out.push('create table if not exists public.country_local_transfer_monthly (')
  out.push('  id              bigserial primary key,')
  out.push('  month           text not null,             -- "YYYY-MM"')
  out.push('  country         text not null,             -- normalized to match phishing_reports.sender_nationality')
  out.push('  source_country  text,                      -- original name from the PDF')
  out.push('  total_txn       integer not null,')
  out.push('  total_amount_krw numeric(20, 2) not null,')
  out.push('  source_file     text,')
  out.push('  imported_at     timestamptz default now(),')
  out.push('  unique (month, country)')
  out.push(');')
  out.push('')
  out.push('create index if not exists idx_local_transfer_month   on public.country_local_transfer_monthly (month);')
  out.push('create index if not exists idx_local_transfer_country on public.country_local_transfer_monthly (country);')
  out.push('')
  out.push('alter table public.country_local_transfer_monthly enable row level security;')
  out.push('drop policy if exists "authenticated users can read country_local_transfer_monthly" on public.country_local_transfer_monthly;')
  out.push('create policy "authenticated users can read country_local_transfer_monthly"')
  out.push('  on public.country_local_transfer_monthly for select to authenticated using (true);')
  out.push('')

  let total = 0
  for (const pdf of pdfs) {
    const month = fileToMonth(pdf)
    if (!month) {
      console.error(`! cannot map filename to month: ${pdf}`)
      continue
    }
    const rows = parsePdf(join(PDF_DIR, pdf))
    if (rows.length === 0) {
      console.error(`! no rows parsed from ${pdf}`)
      continue
    }
    out.push(`-- ${month}  (${rows.length} rows)  from ${pdf}`)
    for (const r of rows) {
      out.push(
        `insert into public.country_local_transfer_monthly ` +
        `(month, country, source_country, total_txn, total_amount_krw, source_file) ` +
        `values (${sqlString(month)}, ${sqlString(r.country)}, ${sqlString(r.sourceCountry)}, ` +
        `${r.totalTxn}, ${r.totalAmountKrw}, ${sqlString(pdf)}) ` +
        `on conflict (month, country) do update set ` +
        `source_country = excluded.source_country, ` +
        `total_txn = excluded.total_txn, ` +
        `total_amount_krw = excluded.total_amount_krw, ` +
        `source_file = excluded.source_file, ` +
        `imported_at = now();`,
      )
    }
    out.push('')
    total += rows.length
    console.log(`✓ ${month}: ${rows.length} rows (${pdf})`)
  }

  if (!existsSync('_seed')) mkdirSync('_seed', { recursive: true })
  writeFileSync(OUT_FILE, out.join('\n') + '\n')
  console.log(`\nWrote ${OUT_FILE} — ${total} total rows across ${pdfs.length} files.`)
}

main()
