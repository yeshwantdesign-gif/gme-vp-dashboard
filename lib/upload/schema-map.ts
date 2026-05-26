// Translate gme-vp-analyze's preprocessed rows into the dashboard's
// snake_case schema used by `public.phishing_reports`.

import type { Row } from './preprocess'

// analyze name → dashboard column name
const COLUMN_MAP: Record<string, string> = {
  'Date of Voice Phishing Report': 'report_date',
  'Date of Voice Phishing Deposit': 'deposit_date',
  'Date of Registration': 'registration_date',
  'Deposit AMT (KRW)': 'deposit_amount_krw',
  'Sender Nationality': 'sender_nationality',
  'Sender Name': 'sender_name',
  'Visa Type': 'visa_type',
  'Visa Expiry': 'visa_expiry',
  'Date of Birth': 'date_of_birth',
  'Deposit Channel': 'deposit_channel',
  'Receiver Country': 'receiver_country',
  'Receiver Name': 'receiver_name',
  'Receiving Bank': 'receiving_bank',
  'ID TYPE': 'id_type',
  'Region Group': 'region_group',
  'Age': 'age',
  'Age Group': 'age_group',
  'Hour': 'hour_of_day',
  'DayOfWeek': 'day_of_week',
  'Reporting Delay': 'reporting_delay_days',
  'Duration between Registration and Voice Phishing': 'days_registered_before_vp',
  'Remittance Time (24)': 'remittance_time',
}

// Columns the destination table accepts.
const DASHBOARD_COLUMNS = new Set([
  'report_date', 'deposit_date', 'registration_date', 'deposit_amount_krw',
  'sender_nationality', 'sender_name', 'visa_type', 'visa_expiry',
  'date_of_birth', 'deposit_channel', 'receiver_country', 'receiver_name',
  'receiving_bank', 'id_type', 'region_group', 'age', 'age_group',
  'hour_of_day', 'day_of_week', 'reporting_delay_days', 'days_registered_before_vp',
  'occupation', 'remittance_time', 'row_hash',
])

/**
 * Convert an analyze-format row into a dashboard-format row.
 * Drops columns that don't exist in the dashboard's table.
 * Coerces `region_group` to one of 'CIS' / 'Non-CIS' (table CHECK constraint).
 */
export function toDashboardRow(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [analyzeKey, dashKey] of Object.entries(COLUMN_MAP)) {
    if (analyzeKey in row) out[dashKey] = row[analyzeKey]
  }
  // Coerce region_group — table has a check constraint
  if (out.region_group !== 'CIS' && out.region_group !== 'Non-CIS') {
    out.region_group = 'Non-CIS'
  }
  // Drop any nullish key whose target column doesn't accept null happily —
  // sender_nationality and report_date are NOT NULL in the table.
  if (out.sender_nationality == null || out.sender_nationality === '') {
    out.sender_nationality = 'Unknown'
  }
  // Strip anything not in the table schema
  for (const k of Object.keys(out)) {
    if (!DASHBOARD_COLUMNS.has(k)) delete out[k]
  }
  return out
}

/**
 * Filter to only rows that have the minimum required fields for insert.
 * Currently: report_date and sender_nationality.
 */
export function isInsertable(row: Record<string, unknown>): boolean {
  return row.report_date != null && row.sender_nationality != null
}
