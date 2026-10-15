ALTER TABLE "account" ADD COLUMN "preview_for" uuid;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "detail" jsonb;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_previewFor_unique" UNIQUE("preview_for");