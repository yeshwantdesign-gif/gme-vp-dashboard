export const METHOD_CATEGORIES = {
  OVERSEAS: ['Bank Deposit', 'Cash Payment', 'Mobile Wallet', 'Card Payout'],
  LOCAL: ['Local Transfer', 'ATM Withdrawal'],
  UNKNOWN: ['Unknown'],
} as const

export type MethodCategoryId = keyof typeof METHOD_CATEGORIES

export const METHOD_CATEGORY_IDS: MethodCategoryId[] = ['OVERSEAS', 'LOCAL', 'UNKNOWN']

export function methodToCategory(method: string): MethodCategoryId {
  for (const id of METHOD_CATEGORY_IDS) {
    if ((METHOD_CATEGORIES[id] as readonly string[]).includes(method)) return id
  }
  return 'UNKNOWN'
}

export function expandCategoriesToMethods(categoryIds: string[]): string[] {
  const out: string[] = []
  for (const id of categoryIds) {
    const members = METHOD_CATEGORIES[id as MethodCategoryId]
    if (members) out.push(...members)
  }
  return out
}
