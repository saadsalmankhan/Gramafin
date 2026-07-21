CREATE TABLE "legal_acceptances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"cookie_policy_version" text,
	"cookie_policy_choice" text,
	"cookie_policy_accepted_at" timestamp with time zone,
	"privacy_policy_version" text,
	"privacy_policy_accepted_at" timestamp with time zone,
	"terms_version" text,
	"terms_accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;