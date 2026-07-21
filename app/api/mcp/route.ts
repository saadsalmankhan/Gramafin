import { z } from 'zod'
import { and, eq, gte, lte } from 'drizzle-orm'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { expenseFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { createExpenseForUser, deleteExpenseForUser } from '@/lib/expenses'
import { createBankAccountForUser } from '@/lib/bankAccounts'
import { verifyToken } from '@/lib/mcp/verifyToken'
import { EXPENSE_CATEGORIES, PAKISTANI_BANKS, type BankAccountType } from '@/types'
import { uid, today } from '@/lib/utils'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import type { Implementation } from '@modelcontextprotocol/sdk/types.js'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// mcp-handler's own ServerOptions.serverInfo type only declares
// {name, version} — narrower than the real MCP SDK's Implementation type
// (checked directly in node_modules: mcp-handler passes this object
// straight through, untouched, to `new McpServer(serverInfo, ...)`), which
// does support icons/websiteUrl/description/title as of SDK 1.26. Typing
// this as a standalone Implementation-typed const (rather than an inline
// object literal at the call site) avoids TypeScript's excess-property
// check, so the extra fields actually reach the client without a cast.
const serverInfo: Implementation = {
  name: 'gramafin',
  version: '1.0.0',
  title: 'Gramafin',
  description: 'Read and manage net worth, expenses, budgets, bank accounts, and credit cards in your Gramafin account.',
  websiteUrl: APP_URL,
  icons: [{ src: `${APP_URL}/logo-mark.png`, mimeType: 'image/png', sizes: ['314x295'] }],
}

// Every tool call arrives with req.auth (set by withMcpAuth below) carrying
// the Gramafin userId resolved from the verified access token — never taken
// from tool input, so one connected client can never read or write another
// user's data by passing a different id. authInfo's shape here is the MCP
// SDK's own generic AuthInfo (extra?: Record<string, unknown>) rather than
// verifyToken's more specific return type — the SDK doesn't thread that
// type through to tool handlers, so this checks the actual value at
// runtime instead of relying on a type that isn't visible here.
function requireUserId(extra: { authInfo?: AuthInfo }): string {
  const userId = extra.authInfo?.extra?.userId
  if (typeof userId !== 'string' || !userId) throw new Error('Unauthorized')
  return userId
}

// withMcpAuth's requiredScopes only gates the whole /api/mcp endpoint (a
// client with just gramafin:read could otherwise still call write tools) —
// this is the actual least-privilege check, called at the top of every
// write tool.
function requireScope(extra: { authInfo?: AuthInfo }, scope: string) {
  if (!extra.authInfo?.scopes?.includes(scope)) {
    throw new Error(`This action requires the "${scope}" scope, which wasn't granted to this connection.`)
  }
}

const handler = createMcpHandler(
  server => {
    server.registerTool(
      'get_net_worth',
      {
        title: 'Get net worth',
        description: 'Returns the current net worth breakdown: cash/assets, bank accounts, investments, mutual funds, net savings, liabilities, and total net worth, all in PKR.',
        inputSchema: {},
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      },
      async (_args, extra) => {
        const userId = requireUserId(extra)
        const breakdown = await db.transaction(tx => recomputeAndUpsertNetWorth(tx, userId))
        return { content: [{ type: 'text', text: JSON.stringify(breakdown, null, 2) }] }
      }
    )

    server.registerTool(
      'list_expenses',
      {
        title: 'List expenses',
        description: 'Lists logged expenses, most recent first. Optionally filter by category and/or an inclusive date range (YYYY-MM-DD).',
        inputSchema: {
          category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]).optional().describe('Filter to one expense category'),
          fromDate: z.string().optional().describe('Inclusive start date, YYYY-MM-DD'),
          toDate: z.string().optional().describe('Inclusive end date, YYYY-MM-DD'),
          limit: z.number().int().positive().max(200).optional().describe('Max rows to return (default 50)'),
        },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      },
      async ({ category, fromDate, toDate, limit }, extra) => {
        const userId = requireUserId(extra)
        const conditions = [eq(schema.expenses.userId, userId)]
        if (category) conditions.push(eq(schema.expenses.category, category))
        if (fromDate) conditions.push(gte(schema.expenses.date, fromDate))
        if (toDate) conditions.push(lte(schema.expenses.date, toDate))

        const rows = await db
          .select()
          .from(schema.expenses)
          .where(and(...conditions))
          .orderBy(schema.expenses.date)
          .limit(limit ?? 50)
        const expenses = rows.map(expenseFromRow).reverse()
        return { content: [{ type: 'text', text: JSON.stringify(expenses, null, 2) }] }
      }
    )

    server.registerTool(
      'add_expense',
      {
        title: 'Add expense',
        description: "Logs a new expense. If `account` matches a real bank account or credit card by name, that account's balance is adjusted (credit cards go up, checking/saving go down) the same way it would from the Gramafin app itself.",
        inputSchema: {
          description: z.string().min(1).describe('What the expense was for'),
          amount: z.number().positive().describe('Amount in PKR'),
          category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]).describe('Expense category'),
          date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
          account: z.string().optional().describe('Bank account or credit card name (as shown in Gramafin), or omit for Cash'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      },
      async ({ description, amount, category, date, account }, extra) => {
        const userId = requireUserId(extra)
        requireScope(extra, 'gramafin:write')
        const result = await db.transaction(tx =>
          createExpenseForUser(tx, userId, {
            id: uid(),
            description,
            amount,
            category: category as (typeof EXPENSE_CATEGORIES)[number],
            date: date || today(),
            account: account ?? null,
          })
        )
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }
    )

    server.registerTool(
      'delete_expense',
      {
        title: 'Delete expense',
        description: 'Deletes a logged expense by id (see list_expenses for ids). If it was linked to a bank/credit-card balance, that balance is reversed.',
        inputSchema: {
          id: z.string().min(1).describe('The expense id, from list_expenses'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      },
      async ({ id }, extra) => {
        const userId = requireUserId(extra)
        requireScope(extra, 'gramafin:write')
        const { deleted, ...result } = await db.transaction(tx => deleteExpenseForUser(tx, userId, id))
        if (!deleted) {
          return { content: [{ type: 'text', text: 'No expense found with that id.' }], isError: true }
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }
    )

    server.registerTool(
      'list_budgets',
      {
        title: 'List budgets',
        description: 'Lists this month’s budget limit and actual spend so far, per expense category.',
        inputSchema: {},
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      },
      async (_args, extra) => {
        const userId = requireUserId(extra)
        const month = today().slice(0, 7)
        const [budgetRows, expenseRows] = await Promise.all([
          db.select().from(schema.budgetLimits).where(eq(schema.budgetLimits.userId, userId)),
          db.select().from(schema.expenses).where(eq(schema.expenses.userId, userId)),
        ])
        const spendByCategory = new Map<string, number>()
        for (const e of expenseRows) {
          if (!e.date.startsWith(month)) continue
          spendByCategory.set(e.category, (spendByCategory.get(e.category) ?? 0) + e.amount)
        }
        const budgets = budgetRows.map(b => ({
          category: b.category,
          limit: b.amount,
          spent: spendByCategory.get(b.category) ?? 0,
        }))
        return { content: [{ type: 'text', text: JSON.stringify({ month, budgets }, null, 2) }] }
      }
    )

    server.registerTool(
      'set_budget',
      {
        title: 'Set budget',
        description: 'Sets the monthly budget limit for one expense category (creates it if not already set).',
        inputSchema: {
          category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]).describe('Expense category'),
          amount: z.number().positive().describe('Monthly limit in PKR'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      },
      async ({ category, amount }, extra) => {
        const userId = requireUserId(extra)
        requireScope(extra, 'gramafin:write')
        await db
          .insert(schema.budgetLimits)
          .values({ userId, category, amount })
          .onConflictDoUpdate({
            target: [schema.budgetLimits.userId, schema.budgetLimits.category],
            set: { amount },
          })
        return { content: [{ type: 'text', text: JSON.stringify({ category, amount }, null, 2) }] }
      }
    )

    server.registerTool(
      'add_bank_account',
      {
        title: 'Add bank account',
        description: 'Adds a checking or savings bank account. Its balance counts toward net worth immediately.',
        inputSchema: {
          bank: z.enum(PAKISTANI_BANKS as [string, ...string[]]).describe('The bank, exactly as Gramafin lists it'),
          type: z.enum(['Checking', 'Saving']).describe('Account type'),
          startingBalance: z.number().describe('Current balance in PKR'),
          nickname: z.string().optional().describe('Optional label, e.g. "Salary account"'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      },
      async ({ bank, type, startingBalance, nickname }, extra) => {
        const userId = requireUserId(extra)
        requireScope(extra, 'gramafin:write')
        const result = await db.transaction(tx =>
          createBankAccountForUser(tx, userId, {
            id: uid(),
            bank,
            type: type as BankAccountType,
            startingBalance,
            nickname,
          })
        )
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }
    )

    server.registerTool(
      'add_credit_card',
      {
        title: 'Add credit card',
        description: 'Adds a credit card. Uses an inverted-sign convention: a positive startingBalance means you currently owe that amount (counts against net worth); a negative balance means the card is in credit and owes you instead.',
        inputSchema: {
          bank: z.enum(PAKISTANI_BANKS as [string, ...string[]]).describe('The card-issuing bank, exactly as Gramafin lists it'),
          startingBalance: z.number().describe('Current balance in PKR — positive means you owe this amount'),
          nickname: z.string().optional().describe('Optional label, e.g. "Visa Platinum"'),
          dueDate: z.string().optional().describe('YYYY-MM-DD next payment due date — enables dashboard reminders'),
          creditLimit: z.number().positive().optional().describe('Credit limit in PKR — enables utilization tracking'),
          minimumPayment: z.number().positive().optional().describe('Minimum payment due, shown alongside reminders'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      },
      async ({ bank, startingBalance, nickname, dueDate, creditLimit, minimumPayment }, extra) => {
        const userId = requireUserId(extra)
        requireScope(extra, 'gramafin:write')
        const result = await db.transaction(tx =>
          createBankAccountForUser(tx, userId, {
            id: uid(),
            bank,
            type: 'Credit Card',
            startingBalance,
            nickname,
            dueDate,
            creditLimit,
            minimumPayment,
          })
        )
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }
    )
  },
  {
    serverInfo,
  },
  {
    // SSE isn't part of the MCP spec as of the 2025-03-26 revision — pure
    // Streamable HTTP doesn't need the Redis-backed pub/sub this app has no
    // other use for, so this stays off rather than adding a new dependency.
    disableSse: true,
    // createMcpHandler matches incoming requests against this by exact
    // string equality against url.pathname — it defaults to "/mcp" (built
    // for the app/[transport]/route.ts convention, mounted at the root),
    // not this route's actual path. Left unset, every real request 404s.
    streamableHttpEndpoint: '/api/mcp',
  }
)

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ['gramafin:read'],
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
