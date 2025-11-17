// FIX: Created 'types.ts' to define shared data structures, resolving 'Cannot find name' and module errors.
export interface Project {
    id: string;
    name: string;
    lastModified: string;
    thumbnailUrl: string;
    creationDate: string;
    description: string;
    size: string; // e.g., "12x12", "6x18"
    language?: string; // "ms" (Malay), "en" (English), "zh" (Chinese)
    isPublic?: number; // 0 = private, 1 = public
    publicVisualId?: string | null; // ID of the campaign_image designated as public visual
    category?: string; // 'ecommerce', 'social_media', 'real_estate', 'food_beverage', 'fashion', 'technology', 'health', 'education', 'other'
    viewCount?: number;
    source?: string; // 'community' for projects duplicated from Community, null for original projects
    originalProjectId?: string; // ID of the original community project (for tracking & analytics)
    originalCreatorName?: string; // Display name of the original creator (for attribution)
    originalPublishDate?: string; // When the original was published to Community
    campaigns?: Campaign[];
    savedImages?: CampaignImage[];
}

// FIX: Added types for the new Brand Kit feature to support data persistence and navigation.
export interface BrandAssetFile {
    name: string;
    dataUrl: string;
}

export interface BrandAssets {
    brandName: string;
    logos: BrandAssetFile[];
    primaryLogoIndex: number;
    colors: string[];
    sampleFiles: BrandAssetFile[];
    referenceFiles: BrandAssetFile[];
    sampleText: string;
    businessCategory: string;
    customBusinessCategory?: string; // Added for 'Other' option
    tagline: string;
    brandKeywords: string;
    toneOfVoice: string;
    geminiApiKey?: string | null;
}

export type Page = 'PROJECTS' | 'BRAND_KIT' | 'EDITOR' | 'SUBSCRIPTION';

// FIX: Added a new `lineSpacing` property to support adjustable vertical spacing for multi-line text, resolving the subheadline rendering bug.
export interface TextSettings {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'center' | 'bottom';
  shadowColor?: string;
  shadowBlur?: number;
  strokeColor?: string;
  strokeWidth?: number;
  letterSpacing?: number;
  useGradient?: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  useBackground?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  lineSpacing?: number;
}

export interface CTAIcon {
  id: string;
  dataUrl: string;
  position: 'before' | 'after';
  size?: number;
}

export interface CTAButton {
  enabled: boolean;
  text: string;
  icons: CTAIcon[];
  horizontalAlign: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'middle' | 'bottom';
  backgroundColor: string;
  textColor: string;
  useGradient: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientAngle?: number;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  autoAdjustColors: boolean;
}

// FIX: Rearchitected `DesignSettings` to support multi-row headlines with independent styling for each row, a shared line spacing control, and a single vertical position for the entire text block.
export interface DesignSettings {
  headline: {
    rows: TextSettings[]; // The verticalPosition on these will be ignored by the renderer
    lineSpacing: number; // e.g. 1.2 for 120%
    verticalPosition: 'top' | 'center' | 'bottom';
  };
  subheadline: TextSettings;
  addLogo: boolean;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center';
  logoSize: number; // Percentage
  logoOpacity: number; // 0-1
  ctaButton?: CTAButton;
}

// FIX: Updated the override type to match the new multi-row headline structure, allowing for granular, per-image, and per-row design adjustments.
export interface DesignSettingsOverride {
  headline?: {
    rows?: (Partial<TextSettings> | null)[];
    lineSpacing?: number;
    verticalPosition?: 'top' | 'center' | 'bottom';
  };
  subheadline?: Partial<TextSettings>;
  addLogo?: boolean;
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center';
  logoSize?: number;
  logoOpacity?: number;
  ctaButton?: Partial<CTAButton>;
}

export interface CampaignImage {
  id: string;
  src: string;
  design?: DesignSettingsOverride;
  isSaved?: boolean; // Frontend-only flag to track saved status (not persisted to database)
  renderedImageUrl?: string; // Fully rendered canvas with text/design (for Community display)
  originalImageUrl?: string; // Original image before inpaint/outpaint (for Before/After comparison)
}

export interface Campaign {
  id:string;
  headline: string;
  subheadline: string;
  description: string;
  hashtags: string[];
  images: CampaignImage[];
}

export interface Template {
  id: string;
  name: string;
  previewUrl: string;
  defaultImageSrc: string;
  defaultCampaign: {
    headline: string;
    subheadline: string;
    description: string;
    hashtags: string[];
  };
  defaultDesign: DesignSettings;
}

// --- AI Usage Summary Types ---
export type AiModel = 'Gemini 2.5 Flash' | 'Imagen 4.0' | 'SDXL' | 'Runware AI';

export interface UsageLog {
  id: string;
  userId: string; // In this simulation, this will be a static ID
  modelUsed: AiModel;
  feature: string;
  apiSource: 'System Key' | 'User Key';
  details: {
    tokens?: number;
    imageCount?: number;
  };
  estimatedCost: number;
  status: 'Success' | 'Failure';
  timestamp: string;
}

export interface UsageSummary {
  totalGenerations: number;
  totalCost: number;
  apiSource: 'System Key' | 'User Key';
  modelBreakdown: {
    [key in AiModel]?: number;
  };
  recentActivity: UsageLog[];
}