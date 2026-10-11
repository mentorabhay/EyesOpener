-- Eyes Opener: User authentication, token verification, and session state management (0011_signin_code).
CREATE TABLE "signin_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_key" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"tries" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "signin_code_email_key_created_at_index" ON "signin_code" USING btree ("email_key","created_at");