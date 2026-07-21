import { View, Text, Svg, Path, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS, formatPKR } from './theme'

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  legend: { flexGrow: 1, gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 7, height: 7, borderRadius: 1.5 },
  legendLabel: { fontSize: 8, color: PDF_COLORS.inkPrimary, flexGrow: 1 },
  legendValue: { fontSize: 8, color: PDF_COLORS.inkMuted },
  centerLabel: { fontSize: 6.5, color: PDF_COLORS.inkMuted, textTransform: 'uppercase' },
  centerValue: { fontSize: 8.5, fontWeight: 700, color: PDF_COLORS.inkPrimary },
})

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// A ring segment between outerR/innerR from startAngle to endAngle (degrees,
// clockwise from 12 o'clock) — the standard SVG donut-slice path recipe.
function donutSlicePath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const p1 = polarToCartesian(cx, cy, outerR, endAngle)
  const p2 = polarToCartesian(cx, cy, outerR, startAngle)
  const p3 = polarToCartesian(cx, cy, innerR, startAngle)
  const p4 = polarToCartesian(cx, cy, innerR, endAngle)
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}

export interface DonutDatum {
  label: string
  value: number
  color: string
}

export function PdfDonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: DonutDatum[]
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 76
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2
  const innerR = outerR * 0.62

  let cursor = 0
  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const startAngle = (cursor / total) * 360
      cursor += d.value
      const endAngle = (cursor / total) * 360
      // A small gap between slices, capped so it never inverts a tiny slice.
      const gap = Math.min(1.5, (endAngle - startAngle) * 0.15)
      return { ...d, path: donutSlicePath(cx, cy, outerR, innerR, startAngle + gap / 2, endAngle - gap / 2) }
    })

  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <Path key={i} d={s.path} fill={s.color} />
        ))}
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={{ position: 'absolute', left: 0, width: size, top: cy - 8, alignItems: 'center' }}>
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
          {centerValue && <Text style={styles.centerValue}>{centerValue}</Text>}
        </View>
      )}
      <View style={styles.legend}>
        {data.filter(d => d.value > 0).map(d => (
          <View key={d.label} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
            <Text style={styles.legendValue}>{formatPKR(d.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
