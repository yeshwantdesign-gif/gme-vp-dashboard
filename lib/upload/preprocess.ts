// TypeScript port of gme-vp-analyze/data_processor.py
// Reads an Excel workbook, normalizes column names + values, derives features,
// and returns rows ready to be mapped to the dashboard schema.

import * as XLSX from 'xlsx'
import Fuse from 'fuse.js'

// ─── Header alias map (Korean + English → standard English) ───────────────
const ALIAS_MAP: Record<string, string[]> = {
  'Date of Voice Phishing Report': ['신고입', '신고일', 'Date of Voice Phishing Report'],
  'Date of Voice Phishing Deposit': ['입금일', 'Date of Voice Phishing Deposit'],
  'Remittance Time (24)': ['입금시간', 'Remittance Time', 'Remittance Time (24)'],
  'Reporting Delay': ['신고 지연일', 'Reporting Delay'],
  'Duration between Registration and Voice Phishing': ['등록일과 VP 발생일 차이', 'Duration between Registration and Voice Phishing'],
  'Deposit Channel': ['입금 경로', 'Deposit Channel'],
  'Date of Registration': ['가입일자', 'Date of Registration'],
  'Deposit AMT (KRW)': ['입금 금액', '송금액', 'Deposit AMT (KRW)'],
  'Sender Name': ['발송인 이름', 'Sender Name'],
  'Sender Nationality': ['발송인 국적', '국적', 'Sender Nationality'],
  'ID TYPE': ['ID 종류', 'ID TYPE'],
  'ID Number': ['ID 번호', 'ID Number'],
  'Date of Birth': ['생년월일', 'Date of Birth'],
  'Visa Type': ['비자 종류', '비자', '체류자격', 'Visa Type'],
  'Visa Expiry': ['비자 만료일', 'Visa Expiry'],
  'Receiver Name': ['수취인 이름', 'Receiver Name'],
  'Receiver Country': ['수취인 국가', 'Receiver Country'],
  'Method': ['수취 방식', 'Method'],
  'Payout': ['수취 금액', 'Payout'],
  'Receiving Bank': ['수취 은행', 'Receiving Bank'],
  'Receiving Account': ['수취 계좌', 'Receiving Account'],
}

// reverse: alias → standard
const REVERSE_ALIAS_MAP: Record<string, string> = {}
for (const [standard, aliases] of Object.entries(ALIAS_MAP)) {
  for (const alias of aliases) {
    REVERSE_ALIAS_MAP[alias] = standard
  }
}

// ─── Manual overrides for categorical fuzzy results ───────────────────────
const CUSTOM_MAPS: Record<string, Record<string, string>> = {
  'Sender Nationality': {
    'South Korea': 'Korea',
    'Republic of Korea': 'Korea',
    'Republic of Kor': 'Korea',
    'ROK': 'Korea',
  },
  'Receiver Country': {
    'South Korea': 'Korea',
    'Republic of Korea': 'Korea',
  },
}

const CIS_COUNTRIES = new Set(
  ['Ukraine', 'Kyrgyzstan', 'Russia', 'Uzbekistan', 'Kazakhstan',
   'Tajikistan', 'Turkmenistan', 'Belarus', 'Armenia', 'Azerbaijan', 'Moldova']
    .map((c) => c.toLowerCase()),
)

// ─── Public types ─────────────────────────────────────────────────────────

export type Row = Record<string, unknown>

export interface PreprocessResult {
  rows: Row[]
  warnings: string[]
}

// ─── Step 1: clean headers ────────────────────────────────────────────────

function cleanHeaders(rows: Row[], warnings: string[]): Row[] {
  if (rows.length === 0) return rows
  const originalCols = Object.keys(rows[0])
  const newCols: Record<string, string> = {}
  for (let i = 0; i < originalCols.length; i++) {
    const orig = originalCols[i]
    // First line, trimmed
    const firstLine = String(orig).split('\n')[0].trim()
    const cleaned = firstLine || `Unnamed: Manual_${i}`
    newCols[orig] = REVERSE_ALIAS_MAP[cleaned] ?? cleaned
  }
  const mapped = rows.map((row) => {
    const out: Row = {}
    for (const [orig, target] of Object.entries(newCols)) {
      if (target.startsWith('Unnamed:')) continue
      // If multiple original columns map to the same standard name, coalesce
      // by taking the first non-null value.
      if (out[target] == null || out[target] === '') out[target] = row[orig]
    }
    return out
  })
  const unknownCols = Object.values(newCols).filter(
    (c) => !c.startsWith('Unnamed:') && !ALIAS_MAP[c],
  )
  if (unknownCols.length > 0) {
    warnings.push(`Unmapped columns (passed through as-is): ${[...new Set(unknownCols)].join(', ')}`)
  }
  return mapped
}

// ─── Step 2: clean cell values (strip tabs, whitespace) ──────────────────

function cleanValues(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = {}
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'string' ? v.replace(/\t/g, '').trim() : v
    }
    return out
  })
}

// ─── Step 3: parse dates ──────────────────────────────────────────────────

const DATE_COLS = [
  'Date of Voice Phishing Report',
  'Date of Voice Phishing Deposit',
  'Date of Birth',
  'Date of Registration',
  'Visa Expiry',
]

function toIsoDate(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    return v.toISOString().slice(0, 10)
  }
  if (typeof v === 'number') {
    // Excel serial number → JS Date (xlsx package uses 1900-based date system)
    // 25569 = 1970-01-01 offset, 86400000 ms/day
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }
  return null
}

function parseDates(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = { ...row }
    for (const col of DATE_COLS) {
      if (col in out) out[col] = toIsoDate(out[col])
    }
    if ('Remittance Time (24)' in out && out['Remittance Time (24)'] != null) {
      out['Remittance Time (24)'] = String(out['Remittance Time (24)'])
    }
    return out
  })
}

// ─── Step 4: fuzzy + manual categorical cleaning ──────────────────────────

/**
 * Consolidate near-duplicate string values within a single column using a
 * frequency-priority strategy: the most frequent term wins; later terms with
 * a high fuzzy similarity get mapped to that term.
 */
function applyFuzzyLogic(values: (string | null)[], threshold = 0.1): (string | null)[] {
  // threshold = Fuse's score cutoff: lower = stricter. Python's thefuzz uses
  // 0-100 (90 = close match). Fuse's score is 0-1 (0 = perfect, 1 = no match).
  // ~0.1 corresponds to a tight fuzzy match similar to thefuzz at 90.
  const counts = new Map<string, number>()
  for (const v of values) {
    if (typeof v === 'string' && v.length > 0) {
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
  }
  // Iterate by frequency desc — most common term wins as the standard.
  const byFreq = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const mapping = new Map<string, string>()
  const standards: string[] = []
  let fuse: Fuse<string> | null = null

  for (const term of byFreq) {
    if (standards.length === 0) {
      standards.push(term)
      mapping.set(term, term)
      fuse = new Fuse(standards, { includeScore: true, threshold, distance: 200 })
      continue
    }
    const [match] = fuse!.search(term)
    if (match && match.score != null && match.score <= threshold) {
      mapping.set(term, match.item)
    } else {
      standards.push(term)
      mapping.set(term, term)
      fuse = new Fuse(standards, { includeScore: true, threshold, distance: 200 })
    }
  }

  return values.map((v) => (typeof v === 'string' && mapping.has(v) ? mapping.get(v)! : v))
}

function cleanCategoricals(rows: Row[]): Row[] {
  const targets = ['Sender Nationality', 'Receiver Country', 'Deposit Channel', 'Visa Type']
  const result = rows.map((r) => ({ ...r }))
  for (const col of targets) {
    if (rows.length === 0 || !(col in rows[0])) continue
    const values = result.map((r) => (typeof r[col] === 'string' ? (r[col] as string) : null))
    const cleaned = applyFuzzyLogic(values)
    const custom = CUSTOM_MAPS[col]
    for (let i = 0; i < result.length; i++) {
      let v = cleaned[i]
      if (custom && typeof v === 'string' && custom[v]) v = custom[v]
      result[i][col] = v
    }
  }
  return result
}

// ─── Step 5: CIS region group ─────────────────────────────────────────────

function addCisColumn(rows: Row[]): Row[] {
  return rows.map((r) => {
    const out: Row = { ...r }
    const nat = out['Sender Nationality']
    if (typeof nat === 'string') {
      out['Region Group'] = CIS_COUNTRIES.has(nat.toLowerCase()) ? 'CIS' : 'Non-CIS'
    } else {
      out['Region Group'] = 'Non-CIS'
    }
    return out
  })
}

// ─── Step 6: numeric cleaning ─────────────────────────────────────────────

const NUMERIC_COLS = ['Deposit AMT (KRW)', 'Damage Amount', 'Duration between Registration and Voice Phishing']

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return isFinite(v) ? v : null
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').trim()
    if (cleaned === '') return null
    const n = Number(cleaned)
    return isFinite(n) ? n : null
  }
  return null
}

function cleanNumerics(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = { ...row }
    for (const col of NUMERIC_COLS) {
      if (col in out) out[col] = toNumber(out[col])
    }
    return out
  })
}

// ─── Step 7: derive Hour, DayOfWeek, Reporting Delay ──────────────────────

function getHour(v: unknown): number | null {
  if (v == null) return null
  const s = String(v).trim().slice(0, 2)
  const n = parseInt(s, 10)
  return isFinite(n) && n >= 0 && n <= 23 ? n : null
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function extractTimeFeatures(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = { ...row }
    if ('Remittance Time (24)' in out) out['Hour'] = getHour(out['Remittance Time (24)'])
    const reportStr = out['Date of Voice Phishing Report'] as string | null | undefined
    if (reportStr) {
      const d = new Date(reportStr)
      if (!isNaN(d.getTime())) out['DayOfWeek'] = DAYS[d.getDay()]
    }
    const depStr = out['Date of Voice Phishing Deposit'] as string | null | undefined
    if (reportStr && depStr) {
      const r = new Date(reportStr).getTime()
      const dep = new Date(depStr).getTime()
      if (!isNaN(r) && !isNaN(dep)) {
        const delta = Math.floor((r - dep) / (1000 * 60 * 60 * 24))
        out['Reporting Delay'] = delta >= 0 ? delta : null
      }
    }
    return out
  })
}

// ─── Step 8: derive Age, Age Group ────────────────────────────────────────

function ageGroup(age: number | null): string {
  if (age == null || age < 0) return 'Unknown'
  if (age < 20) return 'Under 20'
  if (age < 30) return '20s'
  if (age < 40) return '30s'
  if (age < 50) return '40s'
  if (age < 60) return '50s'
  return '60+'
}

function calculateAge(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = { ...row }
    const dobStr = out['Date of Birth'] as string | null | undefined
    const reportStr = out['Date of Voice Phishing Report'] as string | null | undefined
    if (dobStr && reportStr) {
      const dob = new Date(dobStr).getTime()
      const r = new Date(reportStr).getTime()
      if (!isNaN(dob) && !isNaN(r)) {
        const age = Math.round(((r - dob) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
        out['Age'] = age
        out['Age Group'] = ageGroup(age)
      } else {
        out['Age'] = null
        out['Age Group'] = 'Unknown'
      }
    } else {
      out['Age Group'] = 'Unknown'
    }
    return out
  })
}

// ─── Main pipeline ────────────────────────────────────────────────────────

export function preprocessWorkbook(buffer: ArrayBuffer): PreprocessResult {
  const warnings: string[] = []
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const allRows: Row[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true })
    json.forEach((row, idx) => {
      row['Original_Index'] = `${sheetName}_${idx}`
      allRows.push(row)
    })
  }

  if (allRows.length === 0) {
    warnings.push('Workbook contained no data rows.')
    return { rows: [], warnings }
  }

  let rows = cleanHeaders(allRows, warnings)
  rows = cleanValues(rows)
  rows = parseDates(rows)
  rows = cleanCategoricals(rows)
  rows = addCisColumn(rows)
  rows = cleanNumerics(rows)
  rows = extractTimeFeatures(rows)
  rows = calculateAge(rows)

  return { rows, warnings }
}
