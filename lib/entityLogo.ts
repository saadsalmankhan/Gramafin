// Bank accounts show their real bank's logo (self-hosted under
// public/bank-logos/, sourced once from each bank's Wikipedia infobox —
// see /legal for the same "used for identification only, no endorsement
// implied" stance already applied to bank names). Stocks and mutual funds
// fall back to the colored-initials badge already established for expense
// categories (CATEGORY_COLORS + first-two-letters, tinted background) —
// there's no small fixed list to hand-curate real logos for hundreds of
// PSX tickers and MUFAP funds the way there is for 22 banks.

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

export interface EntityLogoInfo {
  initials: string
  color: string
  logoSrc?: string
}

// Hand-curated rather than derived — a fixed list of 22 real bank names
// (see types/index.ts PAKISTANI_BANKS) is small enough to give each one a
// deliberate, recognizable set of initials instead of guessing from the
// raw string (which mangles cases like "United Bank Limited (UBL)").
// initials/color still apply as an <img> load-failure fallback.
export const BANK_LOGO: Record<string, EntityLogoInfo> = {
  'Allied Bank': { initials: 'ABL', color: '#e34948', logoSrc: '/bank-logos/allied-bank.svg' },
  'Askari Bank': { initials: 'AKBL', color: '#1baf7a', logoSrc: '/bank-logos/askari-bank.png' },
  'Bank Al Habib': { initials: 'BAHL', color: '#0e9e8f', logoSrc: '/bank-logos/bank-al-habib.svg' },
  'Bank Alfalah': { initials: 'BAFL', color: '#c2410c', logoSrc: '/bank-logos/bank-alfalah.svg' },
  'Bank of Khyber': { initials: 'BOK', color: '#4a3aa7', logoSrc: '/bank-logos/bank-of-khyber.png' },
  'Bank of Punjab': { initials: 'BOP', color: '#2a78d6', logoSrc: '/bank-logos/bank-of-punjab.png' },
  'BankIslami Pakistan': { initials: 'BIPL', color: '#1baf7a', logoSrc: '/bank-logos/bankislami-pakistan.png' },
  'Dubai Islamic Bank Pakistan': { initials: 'DIB', color: '#eda100', logoSrc: '/bank-logos/dubai-islamic-bank-pakistan.png' },
  'Faysal Bank': { initials: 'FABL', color: '#7a5cf0', logoSrc: '/bank-logos/faysal-bank.svg' },
  'Habib Bank Limited (HBL)': { initials: 'HBL', color: '#e34948', logoSrc: '/bank-logos/habib-bank-limited.png' },
  'Habib Metropolitan Bank': { initials: 'HMB', color: '#e87ba4', logoSrc: '/bank-logos/habib-metropolitan-bank.svg' },
  'JS Bank': { initials: 'JS', color: '#4a3aa7', logoSrc: '/bank-logos/js-bank.png' },
  'MCB Bank': { initials: 'MCB', color: '#c2410c', logoSrc: '/bank-logos/mcb-bank.svg' },
  'Meezan Bank': { initials: 'MEZN', color: '#1baf7a', logoSrc: '/bank-logos/meezan-bank.svg' },
  'National Bank of Pakistan': { initials: 'NBP', color: '#2a78d6', logoSrc: '/bank-logos/national-bank-of-pakistan.svg' },
  'Samba Bank': { initials: 'SMBA', color: '#7a5cf0', logoSrc: '/bank-logos/samba-bank.png' },
  // No Wikipedia logo available — Silkbank merged into UBL in March 2025
  // and its infobox logo field is empty. Falls back to the initials badge.
  'Silk Bank': { initials: 'SILK', color: '#eb6834' },
  'Sindh Bank': { initials: 'SNDH', color: '#0e9e8f', logoSrc: '/bank-logos/sindh-bank.png' },
  'Soneri Bank': { initials: 'SNRI', color: '#eda100', logoSrc: '/bank-logos/soneri-bank.png' },
  'Standard Chartered Pakistan': { initials: 'SC', color: '#1baf7a', logoSrc: '/bank-logos/standard-chartered-pakistan.svg' },
  // Rebranded to "Bank Makramah" in 2023 — same institution, current logo.
  'Summit Bank': { initials: 'SMT', color: '#e34948', logoSrc: '/bank-logos/summit-bank.png' },
  'United Bank Limited (UBL)': { initials: 'UBL', color: '#c2410c', logoSrc: '/bank-logos/united-bank-limited.svg' },
  Other: { initials: '—', color: '#73726c' },
}

export function bankLogo(bankName: string): EntityLogoInfo {
  return BANK_LOGO[bankName] ?? { initials: bankName.slice(0, 2).toUpperCase(), color: colorForString(bankName) }
}

// Stocks are already identified by a short PSX ticker (LUCK, ENGRO, ...) —
// show it as-is (capped) rather than re-deriving initials from it.
export function stockLogo(symbol: string): EntityLogoInfo {
  return { initials: symbol.slice(0, 5).toUpperCase(), color: colorForString(symbol.toUpperCase()) }
}

// Mutual funds only have a full name (e.g. "Meezan Islamic Fund") — derive
// initials from each significant word, capped at 3 letters.
const FUND_STOPWORDS = new Set(['fund', 'the', 'of', 'and'])
export function fundLogo(name: string): EntityLogoInfo {
  const words = name.split(/\s+/).filter(w => w && !FUND_STOPWORDS.has(w.toLowerCase()))
  const initials = (words.length > 0 ? words : [name]).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return { initials: initials || name.slice(0, 2).toUpperCase(), color: colorForString(name) }
}
