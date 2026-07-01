import { CATEGORY_COLORS, ExpenseCategory } from '@/types'

export default function CategoryBadge({ category }: { category: ExpenseCategory }) {
  const color = CATEGORY_COLORS[category] ?? '#888'
  return (
    <span
      className="badge"
      style={{ background: color + '20', color }}
    >
      {category}
    </span>
  )
}
