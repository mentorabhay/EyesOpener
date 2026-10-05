CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "library_vector" (
	"key" text PRIMARY KEY NOT NULL,
	"made_from" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_call" ADD COLUMN "caller" text;--> statement-breakpoint
ALTER TABLE "protocol" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "protocol" ADD COLUMN "embedded_as" text;