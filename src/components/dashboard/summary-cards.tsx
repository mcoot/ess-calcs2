import type { DashboardSummary } from '@/services/dashboard.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/money'
import { formatShares } from '@/lib/format'

interface SummaryCardsProps {
  summary: DashboardSummary
  displayCurrency: 'USD' | 'AUD'
}

interface CardDef {
  label: string
  subtitle: string | ((c: 'USD' | 'AUD') => string)
  value: (s: DashboardSummary, c: 'USD' | 'AUD') => string
}

const CARDS: CardDef[] = [
  {
    label: 'Total ESS Income',
    subtitle: 'Assessable ESS discount income',
    value: (s, c) =>
      formatCurrency(
        c === 'USD' ? (s.totalEssIncomeUsd as number) : (s.totalEssIncomeAud as number),
        c,
      ),
  },
  {
    label: 'Total Capital Gains',
    subtitle: (c) =>
      c === 'USD' ? 'Raw gain/loss (pre-discount, indicative)' : 'Net capital gains after discount',
    value: (s, c) =>
      formatCurrency(
        c === 'USD' ? (s.netCapitalGainsUsd as number) : (s.netCapitalGainsAud as number),
        c,
      ),
  },
  {
    label: 'Total Capital Losses',
    subtitle: (c) => (c === 'USD' ? 'Raw losses (indicative)' : 'Unapplied capital losses'),
    value: (s, c) =>
      formatCurrency(
        c === 'USD' ? (s.totalCapitalLossesUsd as number) : (s.totalCapitalLossesAud as number),
        c,
      ),
  },
  {
    label: 'Awards',
    subtitle: 'RSU grants',
    value: (s) => String(s.awardsCount),
  },
  {
    label: 'Shares Vested',
    subtitle: 'Across all grants',
    value: (s) => formatShares(s.totalSharesVested),
  },
  {
    label: 'Shares Sold',
    subtitle: 'Long shares sold',
    value: (s) => formatShares(s.totalSharesSold),
  },
]

export function SummaryCards({ summary, displayCurrency }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {CARDS.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardDescription>
              {typeof card.subtitle === 'function' ? card.subtitle(displayCurrency) : card.subtitle}
            </CardDescription>
            <CardTitle className="text-lg">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value(summary, displayCurrency)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
