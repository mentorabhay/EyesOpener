CREATE TABLE "site_picture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"kind" text NOT NULL,
	"alt" text NOT NULL,
	"credit" text DEFAULT '' NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"prompt" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_picture_file" (
	"picture_id" uuid NOT NULL,
	"width" integer NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "site_picture_file_picture_id_width_pk" PRIMARY KEY("picture_id","width")
);
--> statement-breakpoint
ALTER TABLE "site_picture" ADD CONSTRAINT "site_picture_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_picture" ADD CONSTRAINT "site_picture_approved_by_app_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_picture_file" ADD CONSTRAINT "site_picture_file_picture_id_site_picture_id_fk" FOREIGN KEY ("picture_id") REFERENCES "public"."site_picture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_picture_slot" ON "site_picture" USING btree ("slot","status");--> statement-breakpoint
CREATE UNIQUE INDEX "site_picture_one_live" ON "site_picture" USING btree ("slot") WHERE status = 'live';