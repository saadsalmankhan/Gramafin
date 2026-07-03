import { INCOME_CATEGORY_COLORS, IncomeCategory } from '@/types'

export default function IncomeCategoryBadge({ category }: { category: IncomeCategory }) {
  const color = INCOME_CATEGORY_COLORS[category] ?? '#888'
  return (
    <span
      className="badge"
      style={{ background: color + '20', color }}
    >
      {category}
    </span>
  )
}
