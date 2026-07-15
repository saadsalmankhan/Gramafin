ALTER TABLE "assets" DROP CONSTRAINT "assets_category_check";--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_check" CHECK (category in ('Credit card', 'Liability'));