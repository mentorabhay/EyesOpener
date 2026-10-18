ALTER TABLE "account" ADD COLUMN "demo_copy_of" uuid;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "demo_tester" text;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "demo_tester_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "account_demo_copy" ON "account" USING btree ("demo_copy_of","demo_tester_key");