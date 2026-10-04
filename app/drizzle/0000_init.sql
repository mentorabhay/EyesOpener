CREATE TYPE "public"."arm" AS ENUM('tried', 'control');--> statement-breakpoint
CREATE TYPE "public"."device_kind" AS ENUM('web', 'phone', 'tv');--> statement-breakpoint
CREATE TYPE "public"."enrol_status" AS ENUM('active', 'paused', 'finished');--> statement-breakpoint
CREATE TYPE "public"."eye" AS ENUM('left', 'right');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('open', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."ladder_step" AS ENUM('story', 'protocol', 'experiment', 'signal', 'reviewed', 'trialled');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('pending', 'active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."mod_status" AS ENUM('open', 'approved', 'removed');--> statement-breakpoint
CREATE TYPE "public"."profile_kind" AS ENUM('adult', 'child');--> statement-breakpoint
CREATE TYPE "public"."pub_status" AS ENUM('draft', 'in_review', 'published', 'blocked', 'archived');--> statement-breakpoint
CREATE TYPE "public"."request_kind" AS ENUM('export', 'delete');--> statement-breakpoint
CREATE TYPE "public"."ring" AS ENUM('rest', 'train', 'light');--> statement-breakpoint
CREATE TYPE "public"."seat" AS ENUM('guardian', 'co_guardian', 'circle');--> statement-breakpoint
CREATE TYPE "public"."session_kind" AS ENUM('game', 'exercise', 'film', 'test', 'monitor', 'outdoor');--> statement-breakpoint
CREATE TYPE "public"."sponsor_kind" AS ENUM('school', 'clinic', 'ngo', 'community', 'donor');--> statement-breakpoint
CREATE TYPE "public"."sponsor_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."sponsor_user_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('super_admin', 'ops', 'content');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"exit_pin_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ahead_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"programme" text NOT NULL,
	"week" integer NOT NULL,
	"body" text NOT NULL,
	"signature" text NOT NULL,
	"status" "pub_status" DEFAULT 'in_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_call" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_usd" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"account_id" uuid,
	"seat" "seat",
	"staff_role" "staff_role",
	"is_counsellor" boolean DEFAULT false NOT NULL,
	"counsellor_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_firebaseUid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"target" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "pub_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"dek" text DEFAULT '' NOT NULL,
	"topic" text NOT NULL,
	"reading_min" integer DEFAULT 3 NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_name" text NOT NULL,
	"model_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "blog_post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"blocks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"text_version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "counsellor_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"counsellor_id" uuid NOT NULL,
	"status" "link_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counsellor_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "request_kind" NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "day_summary" (
	"profile_id" uuid NOT NULL,
	"day" date NOT NULL,
	"rest_breaks" integer DEFAULT 0 NOT NULL,
	"rest_goal" integer DEFAULT 6 NOT NULL,
	"train_minutes" real DEFAULT 0 NOT NULL,
	"train_goal" integer DEFAULT 0 NOT NULL,
	"light_minutes" real DEFAULT 0 NOT NULL,
	"light_goal" integer DEFAULT 90 NOT NULL,
	"screen_minutes" real DEFAULT 0 NOT NULL,
	CONSTRAINT "day_summary_profile_id_day_pk" PRIMARY KEY("profile_id","day")
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "device_kind" NOT NULL,
	"label" text NOT NULL,
	"px_per_cm" real NOT NULL,
	"distance_cm" integer NOT NULL,
	"gamma" real DEFAULT 2.2 NOT NULL,
	"channel_leak" real DEFAULT 0 NOT NULL,
	"calibrated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"programme" text NOT NULL,
	"daily_minutes" integer NOT NULL,
	"days_per_week" integer NOT NULL,
	"week" integer DEFAULT 1 NOT NULL,
	"status" "enrol_status" DEFAULT 'active' NOT NULL,
	"approved_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "experiment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opens_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "experiment_enrolment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"arm" "arm" NOT NULL,
	"baseline_id" uuid,
	"followup_id" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "experiment_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"n_tried" integer NOT NULL,
	"n_control" integer NOT NULL,
	"change_tried" real NOT NULL,
	"change_control" real NOT NULL,
	"low" real NOT NULL,
	"high" real NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eye_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"device_id" uuid,
	"weak_eye" "eye",
	"cyan_eye" "eye" DEFAULT 'left' NOT NULL,
	"strong_contrast" real DEFAULT 1 NOT NULL,
	"balance_log_ratio" real,
	"letter_cm" real NOT NULL,
	"target_cm" real NOT NULL,
	"app_text_px" integer NOT NULL,
	"faint_text" boolean DEFAULT false NOT NULL,
	"flags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'onboarding' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_tile" (
	"wall_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"profile_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "focus_tile_wall_id_idx_pk" PRIMARY KEY("wall_id","idx")
);
--> statement-breakpoint
CREATE TABLE "focus_wall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"picture_url" text,
	"tiles" integer DEFAULT 32 NOT NULL,
	CONSTRAINT "focus_wall_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "fusion_mail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_profile_id" uuid NOT NULL,
	"to_profile_id" uuid NOT NULL,
	"from_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gallery_unlock" (
	"profile_id" uuid NOT NULL,
	"item_slug" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_unlock_profile_id_item_slug_pk" PRIMARY KEY("profile_id","item_slug")
);
--> statement-breakpoint
CREATE TABLE "glasses_leg" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pair_id" uuid NOT NULL,
	"profile_id" uuid,
	"display_name" text NOT NULL,
	"city" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "glasses_pair" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"sponsor_id" uuid,
	CONSTRAINT "glasses_pair_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hazard_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"reason" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"sprite" jsonb NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"seat" "seat" NOT NULL,
	"code" text NOT NULL,
	"status" "invite_status" DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"accepted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "league" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"programme" text NOT NULL,
	"age_band" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "light_gift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_profile_id" uuid NOT NULL,
	"to_profile_id" uuid NOT NULL,
	"note" text,
	"for_day" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"ai_flag" jsonb,
	"status" "mod_status" DEFAULT 'open' NOT NULL,
	"reviewer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "monitor_sample" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"distance_cm" real,
	"blinks_per_min" real,
	"posture" real,
	"minutes_since_break" real,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"device_id" uuid,
	"answers" jsonb NOT NULL,
	"left_seconds" integer,
	"right_seconds" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"kind" "profile_kind" NOT NULL,
	"birth_year" integer,
	"pin_hash" text,
	"access_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "protocol" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid,
	"profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"for_whom" text NOT NULL,
	"do_what" text NOT NULL,
	"how_much" text NOT NULL,
	"weeks" integer NOT NULL,
	"moves" text NOT NULL,
	"step" "ladder_step" DEFAULT 'protocol' NOT NULL,
	"status" "pub_status" DEFAULT 'draft' NOT NULL,
	"hazard" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"device_id" uuid,
	"kind" "session_kind" NOT NULL,
	"item_slug" text NOT NULL,
	"ring" "ring" NOT NULL,
	"minutes" real DEFAULT 0 NOT NULL,
	"strong_contrast" real,
	"score" integer,
	"end_reason" text,
	"stop_symptom" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "sponsor_kind" NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"status" "sponsor_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sponsor_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "sponsor_group_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sponsor_group_member" (
	"group_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsor_group_member_group_id_account_id_pk" PRIMARY KEY("group_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "sponsor_user" (
	"sponsor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "sponsor_user_role" DEFAULT 'owner' NOT NULL,
	CONSTRAINT "sponsor_user_sponsor_id_user_id_pk" PRIMARY KEY("sponsor_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "pub_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streak" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"longest" integer DEFAULT 0 NOT NULL,
	"last_day" date,
	"lights" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"team_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	CONSTRAINT "team_member_team_id_profile_id_pk" PRIMARY KEY("team_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "team_week" (
	"team_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"days_finished" integer DEFAULT 0 NOT NULL,
	"days_possible" integer DEFAULT 6 NOT NULL,
	CONSTRAINT "team_week_team_id_week_start_pk" PRIMARY KEY("team_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "test_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"device_id" uuid,
	"test_key" text NOT NULL,
	"eye" "eye",
	"value" real NOT NULL,
	"unit" text NOT NULL,
	"note" text,
	"raw" jsonb,
	"is_baseline" boolean DEFAULT false NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"red_flag" boolean DEFAULT false NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ahead_note" ADD CONSTRAINT "ahead_note_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_revision" ADD CONSTRAINT "blog_revision_post_id_blog_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counsellor_link" ADD CONSTRAINT "counsellor_link_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counsellor_link" ADD CONSTRAINT "counsellor_link_counsellor_id_app_user_id_fk" FOREIGN KEY ("counsellor_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counsellor_note" ADD CONSTRAINT "counsellor_note_link_id_counsellor_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."counsellor_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_request" ADD CONSTRAINT "data_request_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_request" ADD CONSTRAINT "data_request_handled_by_app_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_summary" ADD CONSTRAINT "day_summary_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment" ADD CONSTRAINT "enrolment_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment" ADD CONSTRAINT "enrolment_approved_by_app_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_protocol_id_protocol_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocol"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD CONSTRAINT "experiment_enrolment_experiment_id_experiment_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD CONSTRAINT "experiment_enrolment_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD CONSTRAINT "experiment_enrolment_baseline_id_test_result_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."test_result"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_enrolment" ADD CONSTRAINT "experiment_enrolment_followup_id_test_result_id_fk" FOREIGN KEY ("followup_id") REFERENCES "public"."test_result"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_signal" ADD CONSTRAINT "experiment_signal_experiment_id_experiment_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eye_profile" ADD CONSTRAINT "eye_profile_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eye_profile" ADD CONSTRAINT "eye_profile_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_tile" ADD CONSTRAINT "focus_tile_wall_id_focus_wall_id_fk" FOREIGN KEY ("wall_id") REFERENCES "public"."focus_wall"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_tile" ADD CONSTRAINT "focus_tile_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fusion_mail" ADD CONSTRAINT "fusion_mail_from_profile_id_profile_id_fk" FOREIGN KEY ("from_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fusion_mail" ADD CONSTRAINT "fusion_mail_to_profile_id_profile_id_fk" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_unlock" ADD CONSTRAINT "gallery_unlock_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glasses_leg" ADD CONSTRAINT "glasses_leg_pair_id_glasses_pair_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."glasses_pair"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glasses_leg" ADD CONSTRAINT "glasses_leg_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glasses_pair" ADD CONSTRAINT "glasses_pair_sponsor_id_sponsor_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero" ADD CONSTRAINT "hero_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_accepted_by_app_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "light_gift" ADD CONSTRAINT "light_gift_from_profile_id_profile_id_fk" FOREIGN KEY ("from_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "light_gift" ADD CONSTRAINT "light_gift_to_profile_id_profile_id_fk" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_item" ADD CONSTRAINT "moderation_item_reviewer_id_app_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_sample" ADD CONSTRAINT "monitor_sample_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_run" ADD CONSTRAINT "onboarding_run_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_run" ADD CONSTRAINT "onboarding_run_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol" ADD CONSTRAINT "protocol_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol" ADD CONSTRAINT "protocol_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor" ADD CONSTRAINT "sponsor_approved_by_app_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_group" ADD CONSTRAINT "sponsor_group_sponsor_id_sponsor_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_group_member" ADD CONSTRAINT "sponsor_group_member_group_id_sponsor_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."sponsor_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_group_member" ADD CONSTRAINT "sponsor_group_member_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_user" ADD CONSTRAINT "sponsor_user_sponsor_id_sponsor_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_user" ADD CONSTRAINT "sponsor_user_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak" ADD CONSTRAINT "streak_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_week" ADD CONSTRAINT "team_week_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ahead_note_programme_week_status_index" ON "ahead_note" USING btree ("programme","week","status");--> statement-breakpoint
CREATE INDEX "ai_call_created_at_index" ON "ai_call" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_user_account_id_index" ON "app_user" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "consent_profile_id_kind_index" ON "consent" USING btree ("profile_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "counsellor_link_profile_id_counsellor_id_index" ON "counsellor_link" USING btree ("profile_id","counsellor_id");--> statement-breakpoint
CREATE INDEX "device_account_id_index" ON "device" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "enrolment_profile_id_status_index" ON "enrolment" USING btree ("profile_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_enrolment_experiment_id_profile_id_index" ON "experiment_enrolment" USING btree ("experiment_id","profile_id");--> statement-breakpoint
CREATE INDEX "eye_profile_profile_id_is_current_index" ON "eye_profile" USING btree ("profile_id","is_current");--> statement-breakpoint
CREATE INDEX "fusion_mail_to_profile_id_created_at_index" ON "fusion_mail" USING btree ("to_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_item_status_index" ON "moderation_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "monitor_sample_profile_id_taken_at_index" ON "monitor_sample" USING btree ("profile_id","taken_at");--> statement-breakpoint
CREATE INDEX "profile_account_id_index" ON "profile" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "protocol_status_step_index" ON "protocol" USING btree ("status","step");--> statement-breakpoint
CREATE INDEX "session_profile_id_started_at_index" ON "session" USING btree ("profile_id","started_at");--> statement-breakpoint
CREATE INDEX "test_result_profile_id_test_key_taken_at_index" ON "test_result" USING btree ("profile_id","test_key","taken_at");