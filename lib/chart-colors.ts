export const CHART_COLORS = [
  '#0ea5e9', // cyan    — Vietnam
  '#7c3aed', // violet  — Uzbekistan
  '#e11d48', // pink    — Korea
  '#d97706', // amber   — Russia
  '#059669', // green   — China
  '#2563eb', // blue    — Kazakhstan
  '#475569', // slate   — Other
  '#94a3b8', // muted   — overflow
] as const

export const RISK_COLORS: Record<string, string> = {
  Critical: '#dc2626',
  High: '#d97706',
  Medium: '#2563eb',
  Low: '#059669',
}
