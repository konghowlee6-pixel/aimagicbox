CREATE TABLE "api_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"tokens_used" integer,
	"cost" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"image_url" text NOT NULL,
	"rendered_image_url" text,
	"design_override" jsonb,
	"visual_analysis" jsonb,
	"edit_metadata" jsonb,
	"is_saved" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"headline" text NOT NULL,
	"subheadline" text NOT NULL,
	"description" text,
	"hashtags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"size" text NOT NULL,
	"thumbnail_url" text,
	"language" text DEFAULT 'en' NOT NULL,
	"brand_kit" jsonb,
	"is_public" integer DEFAULT 0 NOT NULL,
	"public_visual_id" varchar,
	"category" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"source" text,
	"original_project_id" varchar,
	"original_creator_name" text,
	"original_publish_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_video_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_video_id" varchar NOT NULL,
	"asset_type" text NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_video_scenes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_video_id" varchar NOT NULL,
	"scene_index" integer NOT NULL,
	"description" text NOT NULL,
	"image_ref" varchar,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_video_scenes_promo_video_id_scene_index_unique" UNIQUE("promo_video_id","scene_index")
);
--> statement-breakpoint
CREATE TABLE "promo_videos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"status" text NOT NULL,
	"config" jsonb NOT NULL,
	"video_url" text,
	"custom_voiceover_url" text,
	"generation_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "text_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"photo_url" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_plan" text,
	"subscription_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visuals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"type" text NOT NULL,
	"prompt" text,
	"image_url" text NOT NULL,
	"product_image_url" text,
	"metadata" jsonb,
	"creator_id" varchar,
	"creator_name" text,
	"creator_email" text,
	"creator_photo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_images" ADD CONSTRAINT "campaign_images_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_video_assets" ADD CONSTRAINT "promo_video_assets_promo_video_id_promo_videos_id_fk" FOREIGN KEY ("promo_video_id") REFERENCES "public"."promo_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_video_scenes" ADD CONSTRAINT "promo_video_scenes_promo_video_id_promo_videos_id_fk" FOREIGN KEY ("promo_video_id") REFERENCES "public"."promo_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_videos" ADD CONSTRAINT "promo_videos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promo_video_assets_promo_video_id_idx" ON "promo_video_assets" USING btree ("promo_video_id");--> statement-breakpoint
CREATE INDEX "promo_video_scenes_promo_video_id_idx" ON "promo_video_scenes" USING btree ("promo_video_id");--> statement-breakpoint
CREATE INDEX "promo_videos_project_id_idx" ON "promo_videos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "promo_videos_user_id_idx" ON "promo_videos" USING btree ("user_id");