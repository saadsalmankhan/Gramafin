'use client'

import { useEffect, useState, useCallback } from 'react'
import { THEME_KEY } from '@/lib/themeConstants'

export { THEME_KEY }
const THEME_EVENT = 'gramafin-theme-change'
export type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_KEY, theme)
  window.dispatchEvent(new CustomEvent(THEME_EVENT))
}

// Device-level display preference (like OS dark mode), not synced through
// the cloud account state — deliberately, so it applies instantly on load
// with no flash-of-wrong-theme while cloud data is still fetching, and so
// two devices can reasonably differ (dark on a phone at night, light on a
// bright desk monitor).
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    setThemeState(currentTheme())
    function onChange() { setThemeState(currentTheme()) }
    window.addEventListener(THEME_EVENT, onChange)
    return () => window.removeEventListener(THEME_EVENT, onChange)
  }, [])

  const setTheme = useCallback((next: Theme) => applyTheme(next), [])
  const toggle = useCallback(() => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'), [])

  return { theme, setTheme, toggle }
}

// Recharts renders to raw SVG attributes, not Tailwind classes, so its axis
// text, grid lines, and tooltip chrome can't pick up dark: variants — these
// literal values are hand-matched to the ink/surface tokens in globals.css
// for each theme instead.
const LIGHT_CHART_COLORS = {
  axisText: '#8a8880',
  gridStroke: '#c3c2b7',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e5e5',
  mutedText: '#52514e',
}
const DARK_CHART_COLORS = {
  axisText: '#7e7c76',
  gridStroke: 'rgba(255,255,255,0.15)',
  tooltipBg: '#201f1e',
  tooltipBorder: 'rgba(255,255,255,0.1)',
  mutedText: '#b0aea8',
}

export type ChartColors = typeof LIGHT_CHART_COLORS

export function useChartColors(): ChartColors {
  const { theme } = useTheme()
  return theme === 'dark' ? DARK_CHART_COLORS : LIGHT_CHART_COLORS
}
