CREATE TABLE "discovery_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"question" text NOT NULL,
	"why" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"answer" text,
	"answer_basis" text,
	"answer_members" integer,
	"answered_at" timestamp with time zone,
	"answered_by" uuid,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_round" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"closes_on" date NOT NULL,
	"closed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_vote" (
	"round_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_vote_round_id_profile_id_pk" PRIMARY KEY("round_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "duet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"a_profile_id" uuid NOT NULL,
	"b_profile_id" uuid,
	"b_user_id" uuid,
	"started_on" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_place" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"joined_by" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"welcome" text
);
--> statement-breakpoint
CREATE TABLE "signin_ask" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signin_removal" (
	"uid" text PRIMARY KEY NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tries" integer DEFAULT 0 NOT NULL,
	"last_try_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "sessions_valid_after" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "focus_tile" ADD COLUMN "day" date;--> statement-breakpoint
ALTER TABLE "monitor_sample" ADD COLUMN "face_seconds" real;--> statement-breakpoint
ALTER TABLE "monitor_sample" ADD COLUMN "half_blinks_per_min" real;--> statement-breakpoint
ALTER TABLE "monitor_sample" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "discovery_question" ADD CONSTRAINT "discovery_question_round_id_discovery_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."discovery_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_question" ADD CONSTRAINT "discovery_question_answered_by_app_user_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_question" ADD CONSTRAINT "discovery_question_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_round" ADD CONSTRAINT "discovery_round_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_vote" ADD CONSTRAINT "discovery_vote_round_id_discovery_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."discovery_round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_vote" ADD CONSTRAINT "discovery_vote_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_vote" ADD CONSTRAINT "discovery_vote_question_id_discovery_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."discovery_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duet" ADD CONSTRAINT "duet_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duet" ADD CONSTRAINT "duet_a_profile_id_profile_id_fk" FOREIGN KEY ("a_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duet" ADD CONSTRAINT "duet_b_profile_id_profile_id_fk" FOREIGN KEY ("b_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duet" ADD CONSTRAINT "duet_b_user_id_app_user_id_fk" FOREIGN KEY ("b_user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duet" ADD CONSTRAINT "duet_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_place" ADD CONSTRAINT "map_place_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_place" ADD CONSTRAINT "map_place_joined_by_app_user_id_fk" FOREIGN KEY ("joined_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_question_round_id_index" ON "discovery_question" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "discovery_vote_question_id_index" ON "discovery_vote" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "duet_account_id_index" ON "duet" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "map_place_area_joined_at_index" ON "map_place" USING btree ("area","joined_at");--> statement-breakpoint
CREATE INDEX "signin_ask_kind_key_at_index" ON "signin_ask" USING btree ("kind","key","at");--> statement-breakpoint
CREATE UNIQUE INDEX "focus_tile_one_a_day" ON "focus_tile" USING btree ("wall_id","profile_id","day");