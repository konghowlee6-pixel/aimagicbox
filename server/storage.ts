import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Campaign,
  type InsertCampaign,
  type CampaignImage,
  type InsertCampaignImage,
  type Visual,
  type InsertVisual,
  type TextContent,
  type InsertTextContent,
  type ApiUsage,
  type InsertApiUsage,
  type UsageStats,
  type ProjectLike,
  type InsertProjectLike,
  type PromoVideo,
  type InsertPromoVideo,
  type PromoVideoScene,
  type InsertPromoVideoScene,
  type PromoVideoAsset,
  type InsertPromoVideoAsset,
  type Quickclip,
  type InsertQuickclip,
  users,
  projects,
  campaigns,
  campaignImages,
  visuals,
  textContent,
  apiUsage,
  projectLikes,
  promoVideos,
  promoVideoScenes,
  promoVideoAssets,
  quickclips,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, sql as sqlOp, inArray } from "drizzle-orm";

// Storage interface for all CRUD operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: string, displayName: string | null, photoURL: string | null): Promise<User | undefined>;
  updateUserSubscription(
    userId: string,
    customerId: string,
    subscriptionId: string,
    plan: string,
    status: string
  ): Promise<User | undefined>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjects(userId: string): Promise<Project[]>;
  getProjectsWithCampaigns(userId: string): Promise<any[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Campaigns
  getCampaign(id: string): Promise<Campaign | undefined>;
  getProjectCampaigns(projectId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Campaign Images
  getCampaignImage(id: string): Promise<CampaignImage | undefined>;
  getCampaignImages(campaignId: string): Promise<CampaignImage[]>;
  createCampaignImage(image: InsertCampaignImage): Promise<CampaignImage>;
  updateCampaignImage(id: string, updates: Partial<CampaignImage>): Promise<CampaignImage | undefined>;
  updateCampaignImageEditMetadata(id: string, editMetadata: any): Promise<void>;
  deleteCampaignImage(id: string): Promise<boolean>;

  // Visuals
  getVisual(id: string): Promise<Visual | undefined>;
  getProjectVisuals(projectId: string): Promise<Visual[]>;
  createVisual(visual: InsertVisual): Promise<Visual>;
  updateVisual(id: string, updates: Partial<Visual>): Promise<Visual | undefined>;

  // Text Content
  getTextContent(id: string): Promise<TextContent | undefined>;
  getProjectTextContent(projectId: string): Promise<TextContent[]>;
  createTextContent(content: InsertTextContent): Promise<TextContent>;

  // API Usage
  createApiUsage(usage: InsertApiUsage): Promise<ApiUsage>;
  getUserUsageStats(userId: string): Promise<UsageStats>;
  getUserUsageHistory(userId: string): Promise<ApiUsage[]>;

  // Community / Public Projects
  getPublicProjects(filters?: { category?: string; size?: string; search?: string; sort?: string; cursor?: string; limit?: number }): Promise<{ items: Project[]; nextCursor: string | null }>;
  toggleProjectPublic(projectId: string, userId: string): Promise<Project | undefined>;
  incrementProjectViewCount(projectId: string): Promise<void>;
  
  // Project Likes
  likeProject(projectId: string, userId: string): Promise<ProjectLike>;
  unlikeProject(projectId: string, userId: string): Promise<boolean>;
  getProjectLikeCount(projectId: string): Promise<number>;
  isProjectLikedByUser(projectId: string, userId: string): Promise<boolean>;
  getUserLikedProjects(userId: string): Promise<string[]>;

  // Promo Videos
  createPromoVideo(video: InsertPromoVideo): Promise<PromoVideo>;
  getPromoVideo(id: string): Promise<PromoVideo | undefined>;
  getPromoVideosByProject(projectId: string): Promise<PromoVideo[]>;
  updatePromoVideo(id: string, updates: Partial<PromoVideo>): Promise<PromoVideo | undefined>;
  deletePromoVideo(id: string): Promise<boolean>;

  // Promo Video Scenes
  createPromoVideoScene(scene: InsertPromoVideoScene): Promise<PromoVideoScene>;
  getPromoVideoScene(id: string): Promise<PromoVideoScene | undefined>;
  getPromoVideoSceneByIndex(promoVideoId: string, sceneIndex: number): Promise<PromoVideoScene | undefined>;
  getPromoVideoScenes(promoVideoId: string): Promise<PromoVideoScene[]>;
  updatePromoVideoScene(id: string, updates: Partial<PromoVideoScene>): Promise<PromoVideoScene | undefined>;
  deletePromoVideoScene(id: string): Promise<boolean>;

  // Promo Video Assets
  createPromoVideoAsset(asset: InsertPromoVideoAsset): Promise<PromoVideoAsset>;
  getPromoVideoAssets(promoVideoId: string): Promise<PromoVideoAsset[]>;
  deletePromoVideoAsset(id: string): Promise<boolean>;

  // QuickClips
  createQuickclip(quickclip: InsertQuickclip): Promise<Quickclip>;
  getQuickclip(id: string): Promise<Quickclip | undefined>;
  updateQuickclip(id: string, updates: Partial<Quickclip>): Promise<Quickclip | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(userId: string, displayName: string | null, photoURL: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ displayName, photoURL })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserSubscription(
    userId: string,
    customerId: string,
    subscriptionId: string,
    plan: string,
    status: string
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionPlan: plan,
        subscriptionStatus: status,
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProjectsWithCampaigns(userId: string): Promise<any[]> {
    // Step 1: Load all projects for the user
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));

    if (userProjects.length === 0) {
      return [];
    }

    // Step 2: Load all campaigns for these projects
    const projectIds = userProjects.map(p => p.id);
    const allCampaigns = await db
      .select()
      .from(campaigns)
      .where(inArray(campaigns.projectId, projectIds));

    // Step 3: Load campaign images for these campaigns
    const campaignIds = allCampaigns.map(c => c.id);
    const allImages = campaignIds.length > 0
      ? await db
          .select()
          .from(campaignImages)
          .where(inArray(campaignImages.campaignId, campaignIds))
      : [];

    // Step 4: Load all visuals (includes QuickClip videos with type='quickclip', mediaType='video')
    const allVisuals = await db
      .select()
      .from(visuals)
      .where(inArray(visuals.projectId, projectIds));

    console.log('[STORAGE] ========== getProjectsWithCampaigns ==========');
    console.log('[STORAGE] Loaded', allVisuals.length, 'visuals (including QuickClip videos) for', userProjects.length, 'projects');
    console.log('[STORAGE] Sample visual:', allVisuals[0]);

    // Step 5: Assemble nested structure
    const projectsWithCampaigns = userProjects.map(project => {
      const projectCampaigns = allCampaigns
        .filter(c => c.projectId === project.id)
        .map(campaign => ({
          ...campaign,
          images: allImages.filter(img => img.campaignId === campaign.id)
        }));
      
      const savedImages = allVisuals.filter(v => v.projectId === project.id);

      console.log('[STORAGE] Project', project.name, 'has', savedImages.length, 'savedImages (types:', savedImages.map(v => v.type).join(', '), ')');

      // Return as plain object to ensure campaigns and savedImages survive JSON serialization
      return JSON.parse(JSON.stringify({
        ...project,
        campaigns: projectCampaigns,
        savedImages: savedImages
      }));
    });

    return projectsWithCampaigns;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject as any).returning();
    return project;
  }

  async updateProject(
    id: string,
    updates: Partial<Project>,
  ): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Visuals
  async getVisual(id: string): Promise<Visual | undefined> {
    const [visual] = await db.select().from(visuals).where(eq(visuals.id, id));
    return visual || undefined;
  }

  async getProjectVisuals(projectId: string): Promise<Visual[]> {
    // Filter out visuals older than 60 days (expired)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const allVisuals = await db
      .select()
      .from(visuals)
      .where(eq(visuals.projectId, projectId))
      .orderBy(desc(visuals.createdAt));
    
    // Filter out expired visuals (older than 60 days)
    const activeVisuals = allVisuals.filter(visual => {
      const createdAt = new Date(visual.createdAt);
      return createdAt >= sixtyDaysAgo;
    });
    
    return activeVisuals;
  }

  async createVisual(insertVisual: InsertVisual): Promise<Visual> {
    const [visual] = await db.insert(visuals).values(insertVisual).returning();
    return visual;
  }

  async updateVisual(id: string, updates: Partial<Visual>): Promise<Visual | undefined> {
    const [visual] = await db
      .update(visuals)
      .set(updates)
      .where(eq(visuals.id, id))
      .returning();
    return visual || undefined;
  }

  // Text Content
  async getTextContent(id: string): Promise<TextContent | undefined> {
    const [content] = await db.select().from(textContent).where(eq(textContent.id, id));
    return content || undefined;
  }

  async getProjectTextContent(projectId: string): Promise<TextContent[]> {
    return await db
      .select()
      .from(textContent)
      .where(eq(textContent.projectId, projectId))
      .orderBy(desc(textContent.createdAt));
  }

  async createTextContent(insertContent: InsertTextContent): Promise<TextContent> {
    const [content] = await db.insert(textContent).values(insertContent as any).returning();
    return content;
  }

  // API Usage
  async createApiUsage(insertUsage: InsertApiUsage): Promise<ApiUsage> {
    const [usage] = await db.insert(apiUsage).values(insertUsage).returning();
    return usage;
  }

  async getUserUsageStats(userId: string): Promise<UsageStats> {
    const userProjects = await this.getProjects(userId);
    const projectIds = userProjects.map((p) => p.id);

    let totalVisuals = 0;
    let totalTextContent = 0;

    if (projectIds.length > 0) {
      const visualsData = await db.select().from(visuals);
      const textContentData = await db.select().from(textContent);
      
      totalVisuals = visualsData.filter(v => projectIds.includes(v.projectId)).length;
      totalTextContent = textContentData.filter(tc => projectIds.includes(tc.projectId)).length;
    }

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageThisMonth = await db
      .select()
      .from(apiUsage)
      .where(and(eq(apiUsage.userId, userId), gte(apiUsage.timestamp, firstOfMonth)));

    const apiCallsThisMonth = usageThisMonth.length;
    const costThisMonth = usageThisMonth.reduce((sum, u) => sum + (u.cost || 0), 0);
    const tokensUsedThisMonth = usageThisMonth.reduce(
      (sum, u) => sum + (u.tokensUsed || 0),
      0,
    );

    return {
      totalProjects: userProjects.length,
      totalVisuals,
      totalTextContent,
      apiCallsThisMonth,
      costThisMonth,
      tokensUsedThisMonth,
    };
  }

  async getUserUsageHistory(userId: string): Promise<ApiUsage[]> {
    return await db
      .select()
      .from(apiUsage)
      .where(eq(apiUsage.userId, userId))
      .orderBy(desc(apiUsage.timestamp));
  }

  // Campaigns
  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getProjectCampaigns(projectId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.projectId, projectId))
      .orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(insertCampaign as any).returning();
    return campaign;
  }

  async updateCampaign(
    id: string,
    updates: Partial<Campaign>,
  ): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Campaign Images
  async getCampaignImage(id: string): Promise<CampaignImage | undefined> {
    const [image] = await db.select().from(campaignImages).where(eq(campaignImages.id, id));
    return image || undefined;
  }

  async getCampaignImages(campaignId: string): Promise<CampaignImage[]> {
    // Filter out images older than 60 days (expired)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const allImages = await db
      .select()
      .from(campaignImages)
      .where(eq(campaignImages.campaignId, campaignId))
      .orderBy(desc(campaignImages.createdAt));
    
    // Filter out expired images (older than 60 days)
    const activeImages = allImages.filter(image => {
      const createdAt = new Date(image.createdAt);
      return createdAt >= sixtyDaysAgo;
    });
    
    return activeImages;
  }

  async createCampaignImage(insertImage: InsertCampaignImage): Promise<CampaignImage> {
    const [image] = await db.insert(campaignImages).values(insertImage as any).returning();
    return image;
  }

  async updateCampaignImage(
    id: string,
    updates: Partial<CampaignImage>,
  ): Promise<CampaignImage | undefined> {
    const [image] = await db
      .update(campaignImages)
      .set(updates)
      .where(eq(campaignImages.id, id))
      .returning();
    return image || undefined;
  }

  async updateCampaignImageEditMetadata(id: string, editMetadata: any): Promise<void> {
    await db
      .update(campaignImages)
      .set({ editMetadata })
      .where(eq(campaignImages.id, id));
  }

  async deleteCampaignImage(id: string): Promise<boolean> {
    const result = await db.delete(campaignImages).where(eq(campaignImages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Community / Public Projects
  async getPublicProjects(filters?: { category?: string; size?: string; search?: string; sort?: string; cursor?: string; limit?: number }): Promise<{ items: Project[]; nextCursor: string | null }> {
    const limit = Math.min(filters?.limit || 12, 48); // Default 12, cap at 48
    const sort = filters?.sort || 'newest';
    
    // Parse cursor if provided
    let cursorData: any = null;
    if (filters?.cursor) {
      try {
        const decoded = Buffer.from(filters.cursor, 'base64').toString('utf-8');
        cursorData = JSON.parse(decoded);
      } catch (error) {
        throw new Error('Invalid cursor format');
      }
    }

    // Base conditions
    const conditions = [
      eq(projects.isPublic, 1),
      sqlOp`${projects.publicVisualId} IS NOT NULL`
    ];

    if (filters?.category) {
      conditions.push(eq(projects.category, filters.category));
    }
    
    if (filters?.size) {
      conditions.push(eq(projects.size, filters.size));
    }

    if (filters?.search) {
      conditions.push(sqlOp`${projects.name} ILIKE ${'%' + filters.search + '%'}`);
    }

    // Add cursor conditions based on sort mode
    if (cursorData) {
      if (sort === 'popular') {
        // Cursor: { likeCount, updatedAt, id }
        if (!cursorData.likeCount === undefined || !cursorData.updatedAt || !cursorData.id) {
          throw new Error('Invalid cursor fields for popular sort');
        }
        conditions.push(
          sqlOp`(COALESCE((SELECT COUNT(*) FROM ${projectLikes} WHERE ${projectLikes.projectId} = ${projects.id}), 0), ${projects.updatedAt}, ${projects.id}) < (${cursorData.likeCount}, ${cursorData.updatedAt}, ${cursorData.id})`
        );
      } else {
        // Cursor: { updatedAt, id }
        if (!cursorData.updatedAt || !cursorData.id) {
          throw new Error('Invalid cursor fields for newest sort');
        }
        conditions.push(
          sqlOp`(${projects.updatedAt}, ${projects.id}) < (${cursorData.updatedAt}, ${cursorData.id})`
        );
      }
    }

    // Determine sorting order
    let orderByClause;
    if (sort === 'popular') {
      // Order by like count DESC, then updatedAt DESC, then id DESC for deterministic ordering
      orderByClause = [
        sqlOp`COALESCE((SELECT COUNT(*) FROM ${projectLikes} WHERE ${projectLikes.projectId} = ${projects.id}), 0) DESC`,
        desc(projects.updatedAt),
        desc(projects.id)
      ];
    } else {
      // Order by updatedAt DESC, then id DESC for deterministic ordering
      orderByClause = [desc(projects.updatedAt), desc(projects.id)];
    }

    // Query limit + 1 to check if there are more results
    const results = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(...orderByClause)
      .limit(limit + 1);

    // Determine if there are more pages
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // Generate nextCursor from last item
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      
      // We need to get like count for cursor if using popular sort
      let cursorObj: any;
      if (sort === 'popular') {
        const likeCount = await this.getProjectLikeCount(lastItem.id);
        cursorObj = {
          likeCount,
          updatedAt: lastItem.updatedAt.toISOString(),
          id: lastItem.id
        };
      } else {
        cursorObj = {
          updatedAt: lastItem.updatedAt.toISOString(),
          id: lastItem.id
        };
      }
      
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    return { items, nextCursor };
  }

  async toggleProjectPublic(projectId: string, userId: string): Promise<Project | undefined> {
    const project = await this.getProject(projectId);
    if (!project || project.userId !== userId) {
      return undefined;
    }

    const newIsPublic = project.isPublic === 1 ? 0 : 1;
    return await this.updateProject(projectId, { isPublic: newIsPublic });
  }

  async incrementProjectViewCount(projectId: string): Promise<void> {
    await db
      .update(projects)
      .set({ viewCount: sqlOp`${projects.viewCount} + 1` })
      .where(eq(projects.id, projectId));
  }

  // Project Likes
  async likeProject(projectId: string, userId: string): Promise<ProjectLike> {
    const existing = await db
      .select()
      .from(projectLikes)
      .where(and(eq(projectLikes.projectId, projectId), eq(projectLikes.userId, userId)));

    if (existing.length > 0) {
      return existing[0];
    }

    const [like] = await db
      .insert(projectLikes)
      .values({ projectId, userId } as InsertProjectLike)
      .returning();
    return like;
  }

  async unlikeProject(projectId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(projectLikes)
      .where(and(eq(projectLikes.projectId, projectId), eq(projectLikes.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getProjectLikeCount(projectId: string): Promise<number> {
    const likes = await db
      .select()
      .from(projectLikes)
      .where(eq(projectLikes.projectId, projectId));
    return likes.length;
  }

  async isProjectLikedByUser(projectId: string, userId: string): Promise<boolean> {
    const likes = await db
      .select()
      .from(projectLikes)
      .where(and(eq(projectLikes.projectId, projectId), eq(projectLikes.userId, userId)));
    return likes.length > 0;
  }

  async getUserLikedProjects(userId: string): Promise<string[]> {
    const likes = await db
      .select()
      .from(projectLikes)
      .where(eq(projectLikes.userId, userId));
    return likes.map(like => like.projectId);
  }

  // Promo Videos
  async createPromoVideo(video: InsertPromoVideo): Promise<PromoVideo> {
    const [promoVideo] = await db
      .insert(promoVideos)
      .values(video)
      .returning();
    return promoVideo;
  }

  async getPromoVideo(id: string): Promise<PromoVideo | undefined> {
    const [video] = await db
      .select()
      .from(promoVideos)
      .where(eq(promoVideos.id, id));
    return video || undefined;
  }

  async getPromoVideosByProject(projectId: string): Promise<PromoVideo[]> {
    return await db
      .select()
      .from(promoVideos)
      .where(eq(promoVideos.projectId, projectId))
      .orderBy(desc(promoVideos.createdAt));
  }

  async updatePromoVideo(id: string, updates: Partial<PromoVideo>): Promise<PromoVideo | undefined> {
    const [updated] = await db
      .update(promoVideos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(promoVideos.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePromoVideo(id: string): Promise<boolean> {
    const result = await db
      .delete(promoVideos)
      .where(eq(promoVideos.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Promo Video Scenes
  async createPromoVideoScene(scene: InsertPromoVideoScene): Promise<PromoVideoScene> {
    const [promoScene] = await db
      .insert(promoVideoScenes)
      .values(scene)
      .returning();
    return promoScene;
  }

  async getPromoVideoScene(id: string): Promise<PromoVideoScene | undefined> {
    const [scene] = await db
      .select()
      .from(promoVideoScenes)
      .where(eq(promoVideoScenes.id, id));
    return scene || undefined;
  }

  async getPromoVideoSceneByIndex(promoVideoId: string, sceneIndex: number): Promise<PromoVideoScene | undefined> {
    const [scene] = await db
      .select()
      .from(promoVideoScenes)
      .where(and(eq(promoVideoScenes.promoVideoId, promoVideoId), eq(promoVideoScenes.sceneIndex, sceneIndex)));
    return scene || undefined;
  }

  async getPromoVideoScenes(promoVideoId: string): Promise<PromoVideoScene[]> {
    return await db
      .select()
      .from(promoVideoScenes)
      .where(eq(promoVideoScenes.promoVideoId, promoVideoId))
      .orderBy(promoVideoScenes.sceneIndex);
  }

  async updatePromoVideoScene(id: string, updates: Partial<PromoVideoScene>): Promise<PromoVideoScene | undefined> {
    const [updated] = await db
      .update(promoVideoScenes)
      .set(updates)
      .where(eq(promoVideoScenes.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePromoVideoScene(id: string): Promise<boolean> {
    const result = await db
      .delete(promoVideoScenes)
      .where(eq(promoVideoScenes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Promo Video Assets
  async createPromoVideoAsset(asset: InsertPromoVideoAsset): Promise<PromoVideoAsset> {
    const [promoAsset] = await db
      .insert(promoVideoAssets)
      .values(asset)
      .returning();
    return promoAsset;
  }

  async getPromoVideoAssets(promoVideoId: string): Promise<PromoVideoAsset[]> {
    return await db
      .select()
      .from(promoVideoAssets)
      .where(eq(promoVideoAssets.promoVideoId, promoVideoId))
      .orderBy(desc(promoVideoAssets.createdAt));
  }

  async deletePromoVideoAsset(id: string): Promise<boolean> {
    const result = await db
      .delete(promoVideoAssets)
      .where(eq(promoVideoAssets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // QuickClips
  async createQuickclip(insertQuickclip: InsertQuickclip): Promise<Quickclip> {
    const [quickclip] = await db.insert(quickclips).values(insertQuickclip).returning();
    return quickclip;
  }

  async getQuickclip(id: string): Promise<Quickclip | undefined> {
    const [quickclip] = await db.select().from(quickclips).where(eq(quickclips.id, id));
    return quickclip || undefined;
  }

  async updateQuickclip(id: string, updates: Partial<Quickclip>): Promise<Quickclip | undefined> {
    const [quickclip] = await db
      .update(quickclips)
      .set(updates)
      .where(eq(quickclips.id, id))
      .returning();
    return quickclip || undefined;
  }
}

export const storage = new DatabaseStorage();
