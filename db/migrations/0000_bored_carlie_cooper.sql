CREATE TABLE "assets" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"category" text NOT NULL,
	"credit_limit" numeric(14, 2),
	"due_date" date,
	"minimum_payment" numeric(14, 2),
	CONSTRAINT "assets_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "assets_category_check" CHECK (category in ('Cash / Bank', 'Real estate', 'Stocks', 'Mutual funds', 'Gold / Jewelry', 'Tangible assets', 'Credit card', 'Liability'))
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"bank" text NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"starting_balance" numeric(14, 2) NOT NULL,
	"due_date" date,
	CONSTRAINT "bank_accounts_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "bank_accounts_type_check" CHECK (type in ('Checking', 'Saving', 'Credit Card'))
);
--> statement-breakpoint
CREATE TABLE "budget_limits" (
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	CONSTRAINT "budget_limits_user_id_category_pk" PRIMARY KEY("user_id","category"),
	CONSTRAINT "budget_limits_category_check" CHECK (category in ('Food & Dining', 'Transport', 'Utilities & Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Custom'))
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category" text NOT NULL,
	"date" date NOT NULL,
	"receipt_url" text,
	"account" text,
	CONSTRAINT "expenses_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "expenses_category_check" CHECK (category in ('Food & Dining', 'Transport', 'Utilities & Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Custom'))
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"account" text NOT NULL,
	"date" date NOT NULL,
	"recurring_id" text,
	"deposited_to_account_id" text,
	CONSTRAINT "incomes_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "incomes_category_check" CHECK (category in ('Salary', 'Business Income', 'Freelance / Remote Work', 'Rental Income', 'Foreign Remittance', 'Bank Profit', 'Dividends', 'Capital Gains', 'Agricultural Income', 'Pension', 'Bonus / Commission', 'Provident Fund / Gratuity', 'Prize Bond Winnings', 'Other'))
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"amount_invested" numeric(14, 2) NOT NULL,
	"current_value" numeric(14, 2) NOT NULL,
	"symbol" text,
	"shares_held" numeric(18, 4),
	"buy_price" numeric(14, 4),
	"price_override" numeric(14, 4),
	"last_price_update" timestamp with time zone,
	CONSTRAINT "investments_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "investments_type_check" CHECK (type in ('Stocks', 'Crypto', 'Bonds', 'Other'))
);
--> statement-breakpoint
CREATE TABLE "mutual_funds" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"fund_type" text NOT NULL,
	"units_held" numeric(18, 4) NOT NULL,
	"buy_nav" numeric(14, 4) NOT NULL,
	"current_nav" numeric(14, 4) NOT NULL,
	"nav_override" numeric(14, 4),
	"last_updated" timestamp with time zone,
	"realized_gains" numeric(14, 2) DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "mutual_funds_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "mutual_funds_fund_type_check" CHECK (fund_type in ('Money Market', 'Equity', 'Income', 'Balanced', 'Index', 'Islamic', 'Other'))
);
--> statement-breakpoint
CREATE TABLE "net_worth_snapshots" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"value" numeric(16, 2) NOT NULL,
	CONSTRAINT "net_worth_snapshots_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"stock_market" text DEFAULT 'PK' NOT NULL,
	CONSTRAINT "preferences_currency_check" CHECK (currency in ('PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR')),
	CONSTRAINT "preferences_stock_market_check" CHECK (stock_market in ('PK', 'US', 'UK', 'IN'))
);
--> statement-breakpoint
CREATE TABLE "recurring_incomes" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"account" text NOT NULL,
	"frequency" text NOT NULL,
	"next_date" date NOT NULL,
	CONSTRAINT "recurring_incomes_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "recurring_incomes_category_check" CHECK (category in ('Salary', 'Business Income', 'Freelance / Remote Work', 'Rental Income', 'Foreign Remittance', 'Bank Profit', 'Dividends', 'Capital Gains', 'Agricultural Income', 'Pension', 'Bonus / Commission', 'Provident Fund / Gratuity', 'Prize Bond Winnings', 'Other')),
	CONSTRAINT "recurring_incomes_frequency_check" CHECK (frequency in ('Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_limits" ADD CONSTRAINT "budget_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_recurring_id_fk" FOREIGN KEY ("user_id","recurring_id") REFERENCES "public"."recurring_incomes"("user_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_deposited_to_account_id_fk" FOREIGN KEY ("user_id","deposited_to_account_id") REFERENCES "public"."bank_accounts"("user_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_funds" ADD CONSTRAINT "mutual_funds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_incomes" ADD CONSTRAINT "recurring_incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;