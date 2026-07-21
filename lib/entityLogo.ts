// A small colored initials badge is already the app's established pattern
// for identifying an entity at a glance (see expense category badges on
// the Expenses page: CATEGORY_COLORS + first-two-letters, tinted
// background). This extends the same visual language to bank accounts,
// stocks, and mutual funds — real brand logos would mean either scraping
// third-party trademarked images (legal exposure beyond the plain-text
// bank names already covered in /legal) or depending on an external image
// host going down. A deterministic badge has neither problem and never
// 404s.

const PALETTE = [
  '#2a78d6', '#1baf7a', '#eda100', '#4a3aa7',
  '#e34948', '#e87ba4', '#eb6834', '#0e9e8f',
  '#7a5cf0', '#c2410c',
]

// FNV-1a — fast, deterministic, no external dependency, good enough
// distribution for picking a stable color out of a small fixed palette.
function hashString(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return Math.abs(hash)
}

export function colorForString(key: string): string {
  return PALETTE[hashString(key) % PALETTE.length]
}

// Hand-curated rather than derived — a fixed list of 22 real bank names
// (see types/index.ts PAKISTANI_BANKS) is small enough to give each one a
// deliberate, recognizable set of initials instead of guessing from the
// raw string (which mangles cases like "United Bank Limited (UBL)").
export const BANK_LOGO: Record<string, { initials: string; color: string }> = {
  'Allied Bank': { initials: 'ABL', color: '#e34948' },
  'Askari Bank': { initials: 'AKBL', color: '#1baf7a' },
  'Bank Al Habib': { initials: 'BAHL', color: '#0e9e8f' },
  'Bank Alfalah': { initials: 'BAFL', color: '#c2410c' },
  'Bank of Khyber': { initials: 'BOK', color: '#4a3aa7' },
  'Bank of Punjab': { initials: 'BOP', color: '#2a78d6' },
  'BankIslami Pakistan': { initials: 'BIPL', color: '#1baf7a' },
  'Dubai Islamic Bank Pakistan': { initials: 'DIB', color: '#eda100' },
  'Faysal Bank': { initials: 'FABL', color: '#7a5cf0' },
  'Habib Bank Limited (HBL)': { initials: 'HBL', color: '#e34948' },
  'Habib Metropolitan Bank': { initials: 'HMB', color: '#e87ba4' },
  'JS Bank': { initials: 'JS', color: '#4a3aa7' },
  'MCB Bank': { initials: 'MCB', color: '#c2410c' },
  'Meezan Bank': { initials: 'MEZN', color: '#1baf7a' },
  'National Bank of Pakistan': { initials: 'NBP', color: '#2a78d6' },
  'Samba Bank': { initials: 'SMBA', color: '#7a5cf0' },
  'Silk Bank': { initials: 'SILK', color: '#eb6834' },
  'Sindh Bank': { initials: 'SNDH', color: '#0e9e8f' },
  'Soneri Bank': { initials: 'SNRI', color: '#eda100' },
  'Standard Chartered Pakistan': { initials: 'SC', color: '#1baf7a' },
  'Summit Bank': { initials: 'SMT', color: '#e34948' },
  'United Bank Limited (UBL)': { initials: 'UBL', color: '#c2410c' },
  Other: { initials: '—', color: '#73726c' },
}

export function bankLogo(bankName: string): { initials: string; color: string } {
  return BANK_LOGO[bankName] ?? { initials: bankName.slice(0, 2).toUpperCase(), color: colorForString(bankName) }
}

// Stocks are already identified by a short PSX ticker (LUCK, ENGRO, ...) —
// show it as-is (capped) rather than re-deriving initials from it.
export function stockLogo(symbol: string): { initials: string; color: string } {
  return { initials: symbol.slice(0, 5).toUpperCase(), color: colorForString(symbol.toUpperCase()) }
}

// Mutual funds only have a full name (e.g. "Meezan Islamic Fund") — derive
// initials from each significant word, capped at 3 letters.
const FUND_STOPWORDS = new Set(['fund', 'the', 'of', 'and'])
export function fundLogo(name: string): { initials: string; color: string } {
  const words = name.split(/\s+/).filter(w => w && !FUND_STOPWORDS.has(w.toLowerCase()))
  const initials = (words.length > 0 ? words : [name]).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return { initials: initials || name.slice(0, 2).toUpperCase(), color: colorForString(name) }
}
