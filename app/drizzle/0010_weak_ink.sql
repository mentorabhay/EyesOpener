-- Eyes Opener: Core system module providing logic and utilities for 0010_weak_ink.
ALTER TABLE "eye_profile" ADD COLUMN "weak_ink" text DEFAULT 'cyan' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "weak_ink" text DEFAULT 'cyan' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "weak_ink_at" timestamp with time zone;