ALTER TABLE "bank_accounts" ADD COLUMN "credit_limit" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "minimum_payment" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "deducted_from_account_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_deducted_from_account_id_fk" FOREIGN KEY ("user_id","deducted_from_account_id") REFERENCES "public"."bank_accounts"("user_id","id") ON DELETE set null ON UPDATE no action;