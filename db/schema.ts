import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  date,
  primaryKey,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core'
import {
  EXPENSE_CATEGORIES,
  ASSET_CATEGORIES,
  INVESTMENT_TYPES,
  MUTUAL_FUND_TYPES,
  INCOME_CATEGORIES,
  INCOME_FREQUENCIES,
  BANK_ACCOUNT_TYPES,
  CURRENCIES,
  STOCK_MARKETS,
} from '@/types'

// Renders a `column in ('a', 'b', ...)` CHECK expression from the same TS
// union arrays the app already validates against at the type level, so the
// constraint can't silently drift out of sync with types/index.ts.
function oneOf(column: string, values: readonly string[]) {
  const list = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')
  return sql.raw(`${column} in (${list})`)
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export const preferences = pgTable('preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  currency: text('currency').notNull().default('PKR'),
  stockMarket: text('stock_market').notNull().default('PK'),
}, (table) => [
  check('preferences_currency_check', oneOf('currency', CURRENCIES.map((c) => c.code))),
  check('preferences_stock_market_check', oneOf('stock_market', STOCK_MARKETS.map((m) => m.code))),
])

export const budgetLimits = pgTable('budget_limits', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.category] }),
  check('budget_limits_category_check', oneOf('category', EXPENSE_CATEGORIES)),
])

export const bankAccounts = pgTable('bank_accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  bank: text('bank').notNull(),
  nickname: text('nickname').notNull().default(''),
  type: text('type').notNull(),
  startingBalance: numeric('starting_balance', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  dueDate: date('due_date', { mode: 'string' }),
  // Credit Card only — mirrors the fields Asset-category 'Credit card'
  // liabilities used to carry before that category was folded into here.
  creditLimit: numeric('credit_limit', { precision: 14, scale: 2, mode: 'number' }),
  minimumPayment: numeric('minimum_payment', { precision: 14, scale: 2, mode: 'number' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('bank_accounts_type_check', oneOf('type', BANK_ACCOUNT_TYPES)),
])

export const expenses = pgTable('expenses', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  category: text('category').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  receiptUrl: text('receipt_url'),
  // Deliberately a plain label, not an FK — matches the app's existing
  // convention of snapshotting the account name at save time so deleting a
  // bank account never mutates or cascades into historical expense records.
  account: text('account'),
  // Set when `account` was matched to a real BankAccount at save time and
  // that account's balance was adjusted by this expense's amount — real FK
  // (unlike `account`) since computeNetWorth needs a stable answer to "was
  // this already reflected in an account balance" that can't drift if the
  // account is later renamed. ON DELETE SET NULL, not CASCADE: deleting a
  // bank account should never erase expense history, only detach the link
  // (see incomes.deposited_to_account_id for the identical rationale).
  deductedFromAccountId: text('deducted_from_account_id'),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('expenses_category_check', oneOf('category', EXPENSE_CATEGORIES)),
  foreignKey({
    columns: [table.userId, table.deductedFromAccountId],
    foreignColumns: [bankAccounts.userId, bankAccounts.id],
    name: 'expenses_deducted_from_account_id_fk',
  }).onDelete('set null'),
])

export const assets = pgTable('assets', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  name: text('name').notNull(),
  value: numeric('value', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  category: text('category').notNull(),
  creditLimit: numeric('credit_limit', { precision: 14, scale: 2, mode: 'number' }),
  dueDate: date('due_date', { mode: 'string' }),
  minimumPayment: numeric('minimum_payment', { precision: 14, scale: 2, mode: 'number' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('assets_category_check', oneOf('category', ASSET_CATEGORIES)),
])

export const investments = pgTable('investments', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  amountInvested: numeric('amount_invested', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  currentValue: numeric('current_value', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  symbol: text('symbol'),
  sharesHeld: numeric('shares_held', { precision: 18, scale: 4, mode: 'number' }),
  buyPrice: numeric('buy_price', { precision: 14, scale: 4, mode: 'number' }),
  priceOverride: numeric('price_override', { precision: 14, scale: 4, mode: 'number' }),
  lastPriceUpdate: timestamp('last_price_update', { withTimezone: true, mode: 'string' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('investments_type_check', oneOf('type', INVESTMENT_TYPES)),
])

export const mutualFunds = pgTable('mutual_funds', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  name: text('name').notNull(),
  fundType: text('fund_type').notNull(),
  unitsHeld: numeric('units_held', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  buyNav: numeric('buy_nav', { precision: 14, scale: 4, mode: 'number' }).notNull(),
  currentNav: numeric('current_nav', { precision: 14, scale: 4, mode: 'number' }).notNull(),
  navOverride: numeric('nav_override', { precision: 14, scale: 4, mode: 'number' }),
  lastUpdated: timestamp('last_updated', { withTimezone: true, mode: 'string' }),
  realizedGains: numeric('realized_gains', { precision: 14, scale: 2, mode: 'number' }).notNull().default(0),
  notes: text('notes').notNull().default(''),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('mutual_funds_fund_type_check', oneOf('fund_type', MUTUAL_FUND_TYPES)),
])

export const recurringIncomes = pgTable('recurring_incomes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  source: text('source').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  // Deliberately a plain label, not an FK — same rationale as expenses.account.
  account: text('account').notNull(),
  frequency: text('frequency').notNull(),
  nextDate: date('next_date', { mode: 'string' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('recurring_incomes_category_check', oneOf('category', INCOME_CATEGORIES)),
  check('recurring_incomes_frequency_check', oneOf('frequency', INCOME_FREQUENCIES)),
])

export const incomes = pgTable('incomes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  id: text('id').notNull(),
  source: text('source').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  // Deliberately a plain label, not an FK — same rationale as expenses.account.
  account: text('account').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  recurringId: text('recurring_id'),
  depositedToAccountId: text('deposited_to_account_id'),
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  check('incomes_category_check', oneOf('category', INCOME_CATEGORIES)),
  foreignKey({
    columns: [table.userId, table.recurringId],
    foreignColumns: [recurringIncomes.userId, recurringIncomes.id],
    name: 'incomes_recurring_id_fk',
  }).onDelete('set null'),
  foreignKey({
    columns: [table.userId, table.depositedToAccountId],
    foreignColumns: [bankAccounts.userId, bankAccounts.id],
    name: 'incomes_deposited_to_account_id_fk',
  }).onDelete('set null'),
])

export const netWorthSnapshots = pgTable('net_worth_snapshots', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date', { mode: 'string' }).notNull(),
  value: numeric('value', { precision: 16, scale: 2, mode: 'number' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.date] }),
])
