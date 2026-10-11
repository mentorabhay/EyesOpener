-- Eyes Opener: Core system module providing logic and utilities for 0004_screen_data_league_experiments.
CREATE TABLE "team_move" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_team_id" uuid,
	"to_team_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "scope" text DEFAULT 'household' NOT NULL;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "asked_by" uuid;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "downloaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "delete_after" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_request" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "gamma_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "leak_red_lens" real;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "leak_cyan_lens" real;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "leak_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "ink_balance" real;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "ink_balance_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device" ADD COLUMN "colour_raw" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD COLUMN "left_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD COLUMN "base_px_per_cm" real;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD COLUMN "base_distance_cm" integer;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD COLUMN "follow_px_per_cm" real;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD COLUMN "follow_distance_cm" integer;--> statement-breakpoint
ALTER TABLE "experiment_signal" ADD COLUMN "sd_tried" real;--> statement-breakpoint
ALTER TABLE "experiment_signal" ADD COLUMN "sd_control" real;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "counts_from" date;--> statement-breakpoint
ALTER TABLE "team_week" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_move" ADD CONSTRAINT "team_move_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_move" ADD CONSTRAINT "team_move_from_team_id_team_id_fk" FOREIGN KEY ("from_team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_move" ADD CONSTRAINT "team_move_to_team_id_team_id_fk" FOREIGN KEY ("to_team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_move_profile_id_at_index" ON "team_move" USING btree ("profile_id","at");--> statement-breakpoint
ALTER TABLE "data_request" ADD CONSTRAINT "data_request_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_request" ADD CONSTRAINT "data_request_asked_by_app_user_id_fk" FOREIGN KEY ("asked_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;