// Same values as app/globals.css's light-mode CSS custom properties —
// @react-pdf/renderer can't read CSS variables, so these are copied as
// plain hex, not derived. PDFs are always rendered light-mode regardless
// of the viewer's app theme preference (a document, not a UI surface).
export const PDF_COLORS = {
  brand600: '#008037',
  brand500: '#0EAA51',
  brand50: '#EFFAF4',
  inkPrimary: '#0F0F0E',
  inkSecondary: '#4A4945',
  inkMuted: '#8A8880',
  danger: '#DC2626',
  warning: '#D97706',
  surface0: '#F8F7F4',
  border: '#E5E3DD',
}

export const DISCLOSURE_TEXT =
  'This statement is generated from data you entered yourself into Gramafin and is provided for your personal reference only. ' +
  'It is not a bank or brokerage statement, has not been verified against any financial institution, and may be incomplete or ' +
  'inaccurate. It does not constitute investment, tax, or legal advice. See gramafin.com/legal for full terms.'

export function formatPKR(amount: number): string {
  const rounded = Math.round(amount)
  return `Rs ${Math.abs(rounded).toLocaleString('en-US')}${rounded < 0 ? ' (owed)' : ''}`
}
