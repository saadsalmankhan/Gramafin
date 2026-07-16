import { z } from 'zod'
import { and, eq, gte, lte } from 'drizzle-orm'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { expenseFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { createExpenseForUser, deleteExpenseForUser } from '@/lib/expenses'
import { verifyToken } from '@/lib/mcp/verifyToken'
import { EXPENSE_CATEGORIES } from '@/types'
import { uid, today } from '@/lib/utils'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

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
  },
  {
    serverInfo: { name: 'gramafin', version: '1.0.0' },
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
