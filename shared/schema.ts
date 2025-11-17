import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionPlan: text("subscription_plan"), // 'starter', 'professional', 'enterprise'
  subscriptionStatus: text("subscription_status"), // 'active', 'canceled', 'past_due'
  password: text("password"), // hashed password for email/password auth
  emailVerified: integer("email_verified").default(0).notNull(), // 0 = not verified, 1 = verified
  verificationToken: text("verification_token"), // token for email verification
  verificationTokenExpiry: timestamp("verification_token_expiry"), // expiry time for verification token
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects table - main container for campaigns
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  size: text("size").notNull(), // "12x12", "9x16", etc.
  thumbnailUrl: text("thumbnail_url"),
  language: text("language").default("en").notNull(), // "ms" (Malay), "en" (English), "zh" (Chinese)
  brandKit: jsonb("brand_kit").$type<{
    brandName?: string;
    tagline?: string;
    colors?: string[];
    tone?: string;
  }>(),
  isPublic: integer("is_public").default(0).notNull(), // 0 = private, 1 = public
  publicVisualId: varchar("public_visual_id"), // ID of the campaign_image designated as public visual (null if none selected)
  category: text("category"), // 'ecommerce', 'social_media', 'real_estate', 'food_beverage', 'fashion', 'technology', 'health', 'education', 'other'
  viewCount: integer("view_count").default(0).notNull(),
  source: text("source"), // 'community', null (original project)
  originalProjectId: varchar("original_project_id"), // ID of original community project (for tracking & analytics)
  originalCreatorName: text("original_creator_name"), // Display name of original creator (for attribution)
  originalPublishDate: timestamp("original_publish_date"), // When the original was published to Community
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaigns table - contains ad copy and associated images
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  headline: text("headline").notNull(),
  subheadline: text("subheadline").notNull(),
  description: text("description"),
  hashtags: jsonb("hashtags").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaign Images table - stores generated images with design settings
export const campaignImages = pgTable("campaign_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(), // base64 data URL or cloud storage URL
  renderedImageUrl: text("rendered_image_url"), // fully rendered canvas with text/design (for Community display)
  designOverride: jsonb("design_override"),
  visualAnalysis: jsonb("visual_analysis").$type<{
    detectedFaces?: Array<{ x: number; y: number; width: number; height: number }>;
    detectedObjects?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
    brightnessZones?: Array<{ region: string; brightness: number; variance: number }>;
    recommendedTextRegion?: string;
    recommendedTextColor?: 'light' | 'dark';
    analyzed?: boolean;
  }>(),
  editMetadata: jsonb("edit_metadata").$type<{
    origin?: 'canvas' | 'fusion' | 'template' | null;
    modalEdits?: number;
    lastModalEditAt?: string;
  }>(),
  isSaved: integer("is_saved").default(0), // 0 = not saved, 1 = saved
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Generated visuals from AI (unified media table for images and videos)
export const visuals = pgTable("visuals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  campaignId: varchar("campaign_id"), // nullable - links to campaigns for Generated Visuals display
  type: text("type").notNull(), // 'template', 'fusion', 'generated', 'quickclip', 'promovideo'
  mediaType: text("media_type").notNull().default('image'), // 'image' | 'video'
  status: text("status").default('completed'), // 'generating' | 'completed' | 'failed'
  prompt: text("prompt"),
  imageUrl: text("image_url"), // nullable for videos
  videoUrl: text("video_url"), // nullable for images
  thumbnailUrl: text("thumbnail_url"), // optional poster/preview for videos
  productImageUrl: text("product_image_url"), // for fusion visuals
  metadata: jsonb("metadata").$type<{
    backgroundPrompt?: string;
    placementDescription?: string;
    style?: string;
    negativePrompt?: string;
    quickclipId?: string; // links to parent quickclip job
    taskUUID?: string; // QuickClip task identifier for idempotency
    resolutionKey?: string; // e.g., '3x4_720'
    width?: number;
    height?: number;
    duration?: number; // for videos
    cost?: number; // generation cost in cents
    hasMusic?: boolean; // whether video includes background music
    promoVideoId?: string; // links to parent promovideo
    sceneCount?: number; // number of scenes in promovideo
    errorMessage?: string; // error message if generation failed
  }>(),
  creatorId: varchar("creator_id"), // User who created this visual
  creatorName: text("creator_name"), // Display name of creator
  creatorEmail: text("creator_email"), // Email of creator
  creatorPhoto: text("creator_photo"), // Photo URL of creator
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Generated text content (ad copy, summaries)
export const textContent = pgTable("text_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  type: text("type").notNull(), // 'ad_copy', 'brandkit_summary', 'campaign'
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    platform?: string; // 'facebook', 'instagram', 'google_ads'
    length?: string;
    tone?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API usage tracking
export const apiUsage = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(), // 'gemini_text', 'gemini_image', 'imagen'
  tokensUsed: integer("tokens_used"),
  cost: integer("cost"), // in cents
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Project likes - track which users liked which projects
export const projectLikes = pgTable("project_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// QuickClip generation jobs - tracks batch video generation requests
export const quickclips = pgTable("quickclips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id"), // nullable - links to campaigns for Generated Visuals
  userId: varchar("user_id").notNull(),
  status: text("status").notNull(), // 'pending', 'generating', 'completed', 'failed'
  resolutionKey: text("resolution_key").notNull(), // '1x1_720', '1x1_1080', '3x4_720', '3x4_1080', '16x9_720', '16x9_1080', '9x16_720', '9x16_1080'
  width: integer("width").notNull(), // resolved Seedance width
  height: integer("height").notNull(), // resolved Seedance height
  aspectRatio: text("aspect_ratio").notNull(), // '1:1', '3:4', '16:9', '9:16'
  videoCount: integer("video_count").notNull(), // 1-4 videos to generate
  completedCount: integer("completed_count").default(0).notNull(), // track progress
  config: jsonb("config").$type<{
    imageUrl?: string;
    animationPrompt?: string;
    duration?: number;
    musicStyle?: string;
    enableMusic?: boolean;
  }>().notNull(),
  metadata: jsonb("metadata").$type<{
    taskUUIDs?: string[]; // Runware task UUIDs for video generation
    musicTaskUUID?: string; // Runware task UUID for music generation
    cost?: number;
    errorMessage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("quickclips_project_id_idx").on(table.projectId),
  userIdIdx: index("quickclips_user_id_idx").on(table.userId),
}));

// Promo Videos - AI-generated promotional videos
export const promoVideos = pgTable("promo_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  status: text("status").notNull(), // 'draft', 'generating', 'completed', 'failed'
  config: jsonb("config").$type<{
    sceneCount: 3 | 4 | 5;
    language: 'en' | 'zh';
    voiceType: 'male' | 'female';
    musicStyle: 'calm' | 'modern' | 'corporate' | 'soft' | 'energetic';
    useExistingVisuals: boolean;
  }>().notNull(),
  videoUrl: text("video_url"), // generated video URL in object storage
  customVoiceoverUrl: text("custom_voiceover_url"), // optional uploaded voiceover
  generationMetadata: jsonb("generation_metadata").$type<{
    duration?: number;
    resolution?: string;
    cost?: number;
    apiProvider?: string;
    errorMessage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("promo_videos_project_id_idx").on(table.projectId), // support project queries
  userIdIdx: index("promo_videos_user_id_idx").on(table.userId), // support user queries
}));

// Promo Video Scenes - individual scene configurations
export const promoVideoScenes = pgTable("promo_video_scenes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoVideoId: varchar("promo_video_id").notNull().references(() => promoVideos.id, { onDelete: "cascade" }),
  sceneIndex: integer("scene_index").notNull(), // 0, 1, 2, etc.
  description: text("description").notNull(), // user's scene description
  imageRef: varchar("image_ref"), // reference to campaign_images.id or visuals.id
  imageUrl: text("image_url"), // uploaded image URL if not using existing visuals
  durationSeconds: integer("duration_seconds"), // legacy column for FFmpeg-based videos
  // Runware Video Generation Fields
  runwareTaskUUID: varchar("runware_task_uuid"), // Task UUID from Runware Seedance API for polling
  status: text("status").default('pending'), // 'pending', 'generating', 'success', 'failed'
  sceneVideoUrl: text("scene_video_url"), // Runware-generated video URL for this scene
  resolutionKey: text("resolution_key"), // Resolution identifier (e.g., '1920x1088')
  cost: integer("cost"), // Generation cost in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSceneIndex: unique().on(table.promoVideoId, table.sceneIndex), // prevent duplicate scene ordering
  promoVideoIdIdx: index("promo_video_scenes_promo_video_id_idx").on(table.promoVideoId), // support cascade and queries
}));

// Promo Video Assets - associated media files (voiceover, music, custom uploads)
export const promoVideoAssets = pgTable("promo_video_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoVideoId: varchar("promo_video_id").notNull().references(() => promoVideos.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(), // 'voiceover', 'music', 'custom_audio'
  url: text("url").notNull(), // asset URL in object storage
  metadata: jsonb("metadata").$type<{
    fileName?: string;
    fileSize?: number;
    duration?: number;
    mimeType?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  promoVideoIdIdx: index("promo_video_assets_promo_video_id_idx").on(table.promoVideoId), // support cascade and queries
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
}).extend({
  id: z.string().optional(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().optional(),
});

export const insertCampaignImageSchema = createInsertSchema(campaignImages).omit({
  id: true,
  createdAt: true,
}).extend({
  id: z.string().optional(),
});

export const insertVisualSchema = createInsertSchema(visuals).omit({
  id: true,
  createdAt: true,
});

export const insertTextContentSchema = createInsertSchema(textContent).omit({
  id: true,
  createdAt: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({
  id: true,
  timestamp: true,
});

export const insertProjectLikeSchema = createInsertSchema(projectLikes).omit({
  id: true,
  createdAt: true,
});

export const insertQuickclipSchema = createInsertSchema(quickclips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromoVideoSchema = createInsertSchema(promoVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromoVideoSceneSchema = createInsertSchema(promoVideoScenes).omit({
  id: true,
  createdAt: true,
});

export const insertPromoVideoAssetSchema = createInsertSchema(promoVideoAssets).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type CampaignImage = typeof campaignImages.$inferSelect;
export type InsertCampaignImage = z.infer<typeof insertCampaignImageSchema>;

export type Visual = typeof visuals.$inferSelect;
export type InsertVisual = z.infer<typeof insertVisualSchema>;

export type TextContent = typeof textContent.$inferSelect;
export type InsertTextContent = z.infer<typeof insertTextContentSchema>;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;

export type ProjectLike = typeof projectLikes.$inferSelect;
export type InsertProjectLike = z.infer<typeof insertProjectLikeSchema>;

export type Quickclip = typeof quickclips.$inferSelect;
export type InsertQuickclip = z.infer<typeof insertQuickclipSchema>;

export type PromoVideo = typeof promoVideos.$inferSelect;
export type InsertPromoVideo = z.infer<typeof insertPromoVideoSchema>;

export type PromoVideoScene = typeof promoVideoScenes.$inferSelect;
export type InsertPromoVideoScene = z.infer<typeof insertPromoVideoSceneSchema>;

export type PromoVideoAsset = typeof promoVideoAssets.$inferSelect;
export type InsertPromoVideoAsset = z.infer<typeof insertPromoVideoAssetSchema>;

// API request/response types
export interface GenerateAdCopyRequest {
  projectId: string;
  platform: 'facebook' | 'instagram' | 'google_ads' | 'twitter';
  productName: string;
  productDescription: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'energetic';
}

export interface GenerateAdCopyResponse {
  id: string;
  content: string;
  metadata: {
    platform: string;
    tone: string;
  };
}

export interface GenerateBrandKitRequest {
  projectId: string;
  brandName: string;
  industry: string;
  description: string;
}

export interface GenerateBrandKitResponse {
  summary: string;
  tagline: string;
  colors: string[];
  tone: string;
}

export interface GenerateVisualRequest {
  projectId: string;
  prompt: string;
  style?: string;
  negativePrompt?: string;
  numberOfImages?: number;
  size?: string;
}

export interface GenerateVisualResponse {
  id: string;
  imageUrl: string;
  prompt: string;
}

export interface FusionVisualRequest {
  projectId: string;
  productImageData: string; // base64
  backgroundImageData?: string; // base64 - the actual background scene image
  backgroundPrompt?: string; // AI-generated background description
  placementDescription?: string;
  style?: string;
  canvasSize?: string; // e.g., "12x12", "9x16" - determines output dimensions
}

export interface FusionVisualResponse {
  id: string;
  imageUrl: string;
  productImageUrl: string;
}

export interface UsageStats {
  totalProjects: number;
  totalVisuals: number;
  totalTextContent: number;
  apiCallsThisMonth: number;
  costThisMonth: number;
  tokensUsedThisMonth: number;
}
