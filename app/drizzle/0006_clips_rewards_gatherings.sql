CREATE TABLE "cinema_club" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid,
	"place_kind" text NOT NULL,
	"place_name" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"status" text DEFAULT 'in_review' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listed_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "class_mission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"given_by" uuid,
	"given_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_on" date
);
--> statement-breakpoint
CREATE TABLE "clip_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"device_id" uuid,
	"code" text NOT NULL,
	"outcome" text NOT NULL,
	"value" real,
	"unit" text,
	"detail" jsonb,
	"set_key" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depth_day" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"arcsec" real NOT NULL,
	"played_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keeper_ask" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"programme" text NOT NULL,
	"asked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"welcome_id" uuid,
	"line" text,
	"received_at" timestamp with time zone,
	"thanks" text,
	"thanks_at" timestamp with time zone,
	CONSTRAINT "keeper_ask_enrolmentId_unique" UNIQUE("enrolment_id")
);
--> statement-breakpoint
CREATE TABLE "keeper_welcome" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"programme" text NOT NULL,
	"line" text NOT NULL,
	"left_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"given_at" timestamp with time zone,
	"thanks" text,
	"thanks_at" timestamp with time zone,
	CONSTRAINT "keeper_welcome_enrolmentId_unique" UNIQUE("enrolment_id")
);
--> statement-breakpoint
CREATE TABLE "wish" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"code" text NOT NULL,
	"loves" text NOT NULL,
	"play" text NOT NULL,
	"game" text DEFAULT 'any' NOT NULL,
	"line" text DEFAULT '' NOT NULL,
	"show_first_name" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'in_review' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listed_at" timestamp with time zone,
	"matched_at" timestamp with time zone,
	"built_at" timestamp with time zone,
	"game_slug" text,
	"game_name" text,
	"name_status" text,
	"named_at" timestamp with time zone,
	CONSTRAINT "wish_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "cinema_club" ADD CONSTRAINT "cinema_club_sponsor_id_sponsor_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cinema_club" ADD CONSTRAINT "cinema_club_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_mission" ADD CONSTRAINT "class_mission_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_mission" ADD CONSTRAINT "class_mission_given_by_app_user_id_fk" FOREIGN KEY ("given_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_run" ADD CONSTRAINT "clip_run_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_run" ADD CONSTRAINT "clip_run_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_run" ADD CONSTRAINT "clip_run_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depth_day" ADD CONSTRAINT "depth_day_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_ask" ADD CONSTRAINT "keeper_ask_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_ask" ADD CONSTRAINT "keeper_ask_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_ask" ADD CONSTRAINT "keeper_ask_enrolment_id_enrolment_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_ask" ADD CONSTRAINT "keeper_ask_asked_by_app_user_id_fk" FOREIGN KEY ("asked_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_ask" ADD CONSTRAINT "keeper_ask_welcome_id_keeper_welcome_id_fk" FOREIGN KEY ("welcome_id") REFERENCES "public"."keeper_welcome"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_welcome" ADD CONSTRAINT "keeper_welcome_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_welcome" ADD CONSTRAINT "keeper_welcome_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_welcome" ADD CONSTRAINT "keeper_welcome_enrolment_id_enrolment_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_welcome" ADD CONSTRAINT "keeper_welcome_left_by_app_user_id_fk" FOREIGN KEY ("left_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish" ADD CONSTRAINT "wish_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish" ADD CONSTRAINT "wish_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish" ADD CONSTRAINT "wish_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cinema_club_status_index" ON "cinema_club" USING btree ("status");--> statement-breakpoint
CREATE INDEX "class_mission_profile_id_index" ON "class_mission" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "clip_run_profile_id_code_taken_at_index" ON "clip_run" USING btree ("profile_id","code","taken_at");--> statement-breakpoint
CREATE INDEX "clip_run_account_id_code_taken_at_index" ON "clip_run" USING btree ("account_id","code","taken_at");--> statement-breakpoint
CREATE INDEX "keeper_ask_programme_received_at_index" ON "keeper_ask" USING btree ("programme","received_at");--> statement-breakpoint
CREATE INDEX "keeper_ask_account_id_index" ON "keeper_ask" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "keeper_welcome_programme_given_at_index" ON "keeper_welcome" USING btree ("programme","given_at");--> statement-breakpoint
CREATE INDEX "keeper_welcome_account_id_index" ON "keeper_welcome" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "wish_account_id_index" ON "wish" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "wish_status_index" ON "wish" USING btree ("status");