CREATE TABLE "oauth_model_records" (
	"model_type" text NOT NULL,
	"id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"user_id" uuid,
	"grant_id" text,
	"user_code" text,
	"uid" text,
	"expires_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "oauth_model_records_model_type_id_pk" PRIMARY KEY("model_type","id")
);
--> statement-breakpoint
CREATE INDEX "oauth_model_records_grant_id_idx" ON "oauth_model_records" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "oauth_model_records_user_code_idx" ON "oauth_model_records" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "oauth_model_records_uid_idx" ON "oauth_model_records" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "oauth_model_records_expires_at_idx" ON "oauth_model_records" USING btree ("expires_at");