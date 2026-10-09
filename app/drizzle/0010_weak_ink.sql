ALTER TABLE "eye_profile" ADD COLUMN "weak_ink" text DEFAULT 'cyan' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "weak_ink" text DEFAULT 'cyan' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "weak_ink_at" timestamp with time zone;