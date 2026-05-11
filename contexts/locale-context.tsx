'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, countryNames, type Locale, type Translations } from '@/lib/translations'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  tCountry: (name: string) => string
  tMethod: (name: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : path
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('gme-locale')
    if (stored === 'ko' || stored === 'en') {
      setLocaleState(stored)
    }
    setHydrated(true)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('gme-locale', l)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let value = getNestedValue(
        translations[locale] as unknown as Record<string, unknown>,
        key
      )
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(`{${k}}`, String(v))
        }
      }
      return value
    },
    [locale]
  )

  const tCountry = useCallback(
    (name: string): string => {
      if (locale === 'ko') return countryNames[name] ?? name
      return name
    },
    [locale]
  )

  const tMethod = useCallback(
    (name: string): string => {
      const methods = (translations[locale] as unknown as Record<string, unknown>).dashboard as Record<string, unknown>
      const methodMap = methods.methods as Record<string, string> | undefined
      return methodMap?.[name] ?? name
    },
    [locale]
  )

  // Avoid hydration mismatch — render children only after reading localStorage
  if (!hydrated) return null

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, tCountry, tMethod }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
