import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { preprocessWorkbook } from '@/lib/upload/preprocess'
import { annotateHashes, filterNewRows } from '@/lib/upload/dedupe'
import { toDashboardRow, isInsertable } from '@/lib/upload/schema-map'

// Allow large workbooks
export const runtime = 'nodejs'
export const maxDuration = 60

interface InsertableRow {
  row_hash?: string
  report_date?: string | null
  sender_nationality?: string | null
  [key: string]: unknown
}

export async function POST(req: Request) {
  // 1. Auth check — only logged-in users can upload
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Read the uploaded file from FormData
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
  }

  // 3. Run the preprocessing pipeline
  let processed
  try {
    const buf = await file.arrayBuffer()
    processed = preprocessWorkbook(buf)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown parse error'
    return NextResponse.json({ error: `Failed to parse workbook: ${msg}` }, { status: 400 })
  }

  if (processed.rows.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      inserted: 0,
      skipped: 0,
      warnings: processed.warnings,
    })
  }

  // 4. Hash + dedupe (server-side, uses admin client to read existing hashes)
  annotateHashes(processed.rows)
  const admin = createAdminClient()

  // 5. Map to dashboard schema and filter to valid + new
  const dashboardRows: InsertableRow[] = processed.rows
    .map((row) => {
      const mapped = toDashboardRow(row) as InsertableRow
      mapped.row_hash = row.row_hash as string
      return mapped
    })
    .filter((row) => isInsertable(row))

  const newRows = await filterNewRows(admin, dashboardRows)

  // 6. Bulk insert in batches (Supabase recommends ~500 rows max per insert)
  let inserted = 0
  const CHUNK = 500
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const slice = newRows.slice(i, i + CHUNK)
    const { error } = await admin.from('phishing_reports').insert(slice)
    if (error) {
      return NextResponse.json({
        error: `Insert failed at row ${i}: ${error.message}`,
        inserted,
        warnings: processed.warnings,
      }, { status: 500 })
    }
    inserted += slice.length
  }

  return NextResponse.json({
    ok: true,
    processed: processed.rows.length,
    inserted,
    skipped: processed.rows.length - inserted,
    warnings: processed.warnings,
  })
}
