-- Eyes Opener: Core system module providing logic and utilities for 0008_ink_tuning.
ALTER TABLE "device" ADD COLUMN "cyan_green" real;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "cyan_green_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "red_top" real;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "red_top_at" timestamp with time zone;