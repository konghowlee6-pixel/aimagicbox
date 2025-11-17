CREATE TABLE "quickclips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"campaign_id" varchar,
	"user_id" varchar NOT NULL,
	"status" text NOT NULL,
	"resolution_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"aspect_ratio" text NOT NULL,
	"video_count" integer NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"config" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visuals" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD COLUMN "runware_task_uuid" varchar;--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD COLUMN "scene_video_url" text;--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD COLUMN "resolution_key" text;--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD COLUMN "cost" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "visuals" ADD COLUMN "campaign_id" varchar;--> statement-breakpoint
ALTER TABLE "visuals" ADD COLUMN "media_type" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "visuals" ADD COLUMN "status" text DEFAULT 'completed';--> statement-breakpoint
ALTER TABLE "visuals" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "visuals" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "quickclips" ADD CONSTRAINT "quickclips_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quickclips_project_id_idx" ON "quickclips" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "quickclips_user_id_idx" ON "quickclips" USING btree ("user_id");