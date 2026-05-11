import { createClient } from '@/lib/supabase/server'
import { getCountryRulesets, getCountryPrimaryMethods } from '@/lib/queries'
import { CountryCard } from '@/components/rulesets/country-card'
import { RulesetsHeader } from '@/components/rulesets/rulesets-header'
import { RulesetsExplainer } from '@/components/rulesets/rulesets-explainer'

export default async function RulesetsPage() {
  const supabase = await createClient()
  const [rulesets, primaryMethods] = await Promise.all([
    getCountryRulesets(supabase),
    getCountryPrimaryMethods(supabase),
  ])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <RulesetsHeader count={rulesets.length} />
      <RulesetsExplainer />
      <div className="grid gap-6 lg:grid-cols-2">
        {rulesets.map((rs) => (
          <CountryCard
            key={rs.country}
            ruleset={rs}
            primaryMethod={primaryMethods[rs.country] ?? null}
          />
        ))}
      </div>
    </div>
  )
}
