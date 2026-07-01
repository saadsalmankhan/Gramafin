# Wealth Manager

A personal finance app built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Dashboard** — net worth snapshot, spending chart, budget status, recent transactions
- **Expenses** — log & filter transactions across 8 categories
- **Net worth** — track assets (bank, real estate, gold, stocks, mutual funds, tangible) and liabilities
- **Budget** — set monthly limits per category with live progress bars
- **Investments** — portfolio tracker with gain/loss % and allocation pie chart
- All amounts in **PKR (Pakistani Rupee)**
- Data persists via **localStorage** (no backend needed)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

| Layer      | Choice                          |
|------------|---------------------------------|
| Framework  | Next.js 14 (App Router)         |
| Language   | TypeScript                      |
| Styling    | Tailwind CSS                    |
| Charts     | Recharts                        |
| Icons      | Lucide React                    |
| State      | React Context + useReducer      |
| Persistence| localStorage (client-side)      |

## Project structure

```
app/
  page.tsx              # Dashboard
  expenses/page.tsx     # Expense tracker
  assets/page.tsx       # Net worth
  budget/page.tsx       # Budget planner
  investments/page.tsx  # Portfolio
components/
  Sidebar.tsx
  MetricCard.tsx
  CategoryBadge.tsx
  PageHeader.tsx
lib/
  store.tsx             # Global state (Context + reducer + localStorage)
  utils.ts              # Formatting helpers
types/
  index.ts              # All shared TypeScript types
```
