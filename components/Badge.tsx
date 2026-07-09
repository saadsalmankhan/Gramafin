export default function Badge<T extends string>({ category, colorMap }: { category: T; colorMap: Record<T, string> }) {
  const color = colorMap[category] ?? '#888'
  return (
    <span
      className="badge"
      style={{ background: color + '20', color }}
    >
      {category}
    </span>
  )
}
