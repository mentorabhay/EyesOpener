CREATE TABLE "care_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"item_slug" text NOT NULL,
	"minutes" real DEFAULT 0 NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"per_day" real NOT NULL,
	"days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"set_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"organisation" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_post" ADD COLUMN "hero_art" text DEFAULT 'two-eyes' NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_post" ADD COLUMN "edited_by" uuid;--> statement-breakpoint
ALTER TABLE "blog_post" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_revision" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_revision" ADD COLUMN "edited_by" uuid;--> statement-breakpoint
ALTER TABLE "care_log" ADD CONSTRAINT "care_log_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_log" ADD CONSTRAINT "care_log_confirmed_by_app_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan" ADD CONSTRAINT "care_plan_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan" ADD CONSTRAINT "care_plan_set_by_app_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry" ADD CONSTRAINT "enquiry_handled_by_app_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_log_profile_id_kind_day_index" ON "care_log" USING btree ("profile_id","kind","day");--> statement-breakpoint
CREATE UNIQUE INDEX "care_plan_profile_id_kind_index" ON "care_plan" USING btree ("profile_id","kind");--> statement-breakpoint
CREATE INDEX "enquiry_status_created_at_index" ON "enquiry" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_edited_by_app_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_revision" ADD CONSTRAINT "blog_revision_edited_by_app_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_post_status_published_at_index" ON "blog_post" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_revision_post_id_created_at_index" ON "blog_revision" USING btree ("post_id","created_at");