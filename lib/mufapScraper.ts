import * as cheerio from 'cheerio'

export interface MufapFund {
  fundId: string
  name: string
  amc: string
  nav: number
  offerPrice: number
  category: string
}

// MUFAP's own JSON endpoints (the ones their site's own JS calls, e.g.
// /Home/GetMutualFund) 500 even with browser-identical headers — likely
// requiring some session/anti-forgery state we can't easily replicate
// server-side. Their public Fund Directory page, by contrast, is a plain
// server-rendered HTML table with every fund's current NAV already in the
// markup (no auth, no pagination — all ~500+ funds in one response), so
// that's parsed here instead of fighting the broken API.
const FUND_DIRECTORY_URL = 'https://www.mufap.com.pk/FundProfile/FundDirectory'

function parseNumber(text: string): number {
  const n = parseFloat(text.replace(/,/g, '').trim())
  return isNaN(n) ? 0 : n
}

export async function scrapeMufapFundDirectory(): Promise<MufapFund[]> {
  const res = await fetch(FUND_DIRECTORY_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store', // caching now lives in Redis (see lib/mufapCache.ts), not fetch()
  })
  if (!res.ok) throw new Error(`MUFAP fund directory fetch failed (${res.status})`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const funds: MufapFund[] = []
  $('tr.fund-block').each((_, row) => {
    const $row = $(row)
    const name = $row.find('.card-title').first().text().replace(/\s+/g, ' ').trim()
    if (!name) return

    const amc = $row.find('.card-title').first().parent().find('span').first().text().trim()
    const values = $row.find('.investmentCard p[style*="font-weight: 700"]')
    const nav = parseNumber($(values.get(0)).text())
    const offerPrice = parseNumber($(values.get(1)).text())
    const category = $(values.get(2)).text().trim()

    const detailHref = $row.find('a[href*="FundDetail?FundID="]').attr('href') ?? ''
    const fundId = detailHref.split('FundID=')[1] ?? name

    if (nav > 0) {
      funds.push({ fundId, name, amc, nav, offerPrice, category })
    }
  })

  if (funds.length === 0) throw new Error('Parsed zero funds — MUFAP page structure may have changed')
  return funds
}
