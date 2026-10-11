-- Eyes Opener: Core system module providing logic and utilities for 0001_mail_sender.
ALTER TABLE "fusion_mail" ALTER COLUMN "from_profile_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fusion_mail" ADD COLUMN "from_user_id" uuid;--> statement-breakpoint
ALTER TABLE "fusion_mail" ADD CONSTRAINT "fusion_mail_from_user_id_app_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;