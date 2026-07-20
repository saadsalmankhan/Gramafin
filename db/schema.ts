import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  date,
  jsonb,
  index,
  primaryKey,
  foreignKey,
  check,
  type AnyPgColumn,
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
  // Nullable rather than NOT NULL + default: existing rows predate this
  // column and get backfilled lazily on first bootstrap read (see
  // lib/referrals.ts) rather than via a one-off migration script — one
  // fewer coordinated deploy step, and new signups always get one anyway.
  referralCode: text('referral_code').unique(),
  referredByUserId: uuid('referred_by_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
})

// Tracks each individual email invite a user sends — the source of truth
// for both the "10 points per invite sent" count and, once accepted, the
// "who invited whom, and did they actually join" question. Composite PK on
// (user_id, email) deliberately dedupes: re-inviting the same address
// doesn't re-earn the 10 points or re-send extra rows, so this can't be
// farmed by spamming one email repeatedly.
export const referralInvites = pgTable('referral_invites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  invitedAt: timestamp('invited_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  // Set once (if ever) someone signs up with this exact email while
  // referredByUserId on their new user row points back to this invite's
  // inviter — see lib/auth/users.ts's createUser. Null means still pending.
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'string' }),
  acceptedUserId: uuid('accepted_user_id').references(() => users.id, { onDelete: 'set null' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.email] }),
])

export const preferences = pgTable('preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  currency: text('currency').notNull().default('PKR'),
  stockMarket: text('stock_market').notNull().default('PK'),
  onboardingDismissed: boolean('onboarding_dismissed').notNull().default(false),
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

// Generic storage for the oidc-provider library (MCP OAuth authorization
// server — lets Claude/ChatGPT/etc. connect to a specific Gramafin user's
// account). oidc-provider is model-agnostic about how its Adapter persists
// data as long as the interface contract is met, so one key-value-shaped
// table serves every model it defines (AccessToken, AuthorizationCode,
// Client, Grant, Interaction, RefreshToken, Session, etc.) rather than a
// dozen narrow tables — this is the standard pattern for a custom
// oidc-provider adapter. `userId` is nullable because some models (Client,
// InitialAccessToken) aren't tied to an end user. No user_id FK/cascade:
// oidc-provider manages its own record lifecycle (expiry, consume/destroy,
// revokeByGrantId) independent of the app's user deletion flow, which
// doesn't exist yet anyway.
export const oauthModelRecords = pgTable('oauth_model_records', {
  modelType: text('model_type').notNull(),
  id: text('id').notNull(),
  payload: jsonb('payload').notNull(),
  userId: uuid('user_id'),
  grantId: text('grant_id'),
  userCode: text('user_code'),
  uid: text('uid'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
  primaryKey({ columns: [table.modelType, table.id] }),
  index('oauth_model_records_grant_id_idx').on(table.grantId),
  index('oauth_model_records_user_code_idx').on(table.userCode),
  index('oauth_model_records_uid_idx').on(table.uid),
  index('oauth_model_records_expires_at_idx').on(table.expiresAt),
])
