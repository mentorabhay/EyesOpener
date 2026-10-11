-- Eyes Opener: Core system module providing logic and utilities for 0003_results_and_preview.
ALTER TABLE "account" ADD COLUMN "preview_for" uuid;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "detail" jsonb;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_previewFor_unique" UNIQUE("preview_for");