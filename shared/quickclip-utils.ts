/**
 * QuickClip Video Resolution Utilities
 * Maps user-friendly resolution options to Seedance supported dimensions
 */

export type ResolutionKey =
  | '1x1_720'
  | '1x1_1080'
  | '3x4_720'
  | '3x4_1080'
  | '16x9_720'
  | '16x9_1080'
  | '9x16_720'
  | '9x16_1080';

export interface ResolutionOption {
  key: ResolutionKey;
  label: string;
  aspectRatio: '1:1' | '3:4' | '16:9' | '9:16';
  quality: '720p' | '1080p';
  width: number;
  height: number;
  seedanceResolution: string; // Exact Seedance format
}

/**
 * Seedance 1.0 Pro Fast Supported Resolutions (from replit.md):
 * - 864×480, 736×544, 640×640 (1:1), 544×736, 480×864 (9:16)
 * - 416×960, 960×416, 1920×1088 (16:9), 1664×1248
 * - 1440×1440 (1:1), 1248×1664, 1088×1920 (9:16)
 * - 928×2176, 2176×928
 */
export const QUICKCLIP_RESOLUTIONS: ResolutionOption[] = [
  // 1:1 Square
  {
    key: '1x1_720',
    label: '1:1 (Square) - 720p',
    aspectRatio: '1:1',
    quality: '720p',
    width: 640,
    height: 640,
    seedanceResolution: '640x640',
  },
  {
    key: '1x1_1080',
    label: '1:1 (Square) - 1080p',
    aspectRatio: '1:1',
    quality: '1080p',
    width: 1440,
    height: 1440,
    seedanceResolution: '1440x1440',
  },
  
  // 3:4 Portrait
  {
    key: '3x4_720',
    label: '3:4 (Portrait) - 720p',
    aspectRatio: '3:4',
    quality: '720p',
    width: 544,
    height: 736,
    seedanceResolution: '544x736',
  },
  {
    key: '3x4_1080',
    label: '3:4 (Portrait) - 1080p',
    aspectRatio: '3:4',
    quality: '1080p',
    width: 1248,
    height: 1664,
    seedanceResolution: '1248x1664',
  },
  
  // 16:9 Wide / Landscape
  {
    key: '16x9_720',
    label: '16:9 (Wide / Landscape) - 720p',
    aspectRatio: '16:9',
    quality: '720p',
    width: 864,
    height: 480,
    seedanceResolution: '864x480',
  },
  {
    key: '16x9_1080',
    label: '16:9 (Wide / Landscape) - 1080p',
    aspectRatio: '16:9',
    quality: '1080p',
    width: 1920,
    height: 1088,
    seedanceResolution: '1920x1088',
  },
  
  // 9:16 Ultra-Tall / Portrait
  {
    key: '9x16_720',
    label: '9:16 (Ultra-Tall / Portrait) - 720p',
    aspectRatio: '9:16',
    quality: '720p',
    width: 480,
    height: 864,
    seedanceResolution: '480x864',
  },
  {
    key: '9x16_1080',
    label: '9:16 (Ultra-Tall / Portrait) - 1080p',
    aspectRatio: '9:16',
    quality: '1080p',
    width: 1088,
    height: 1920,
    seedanceResolution: '1088x1920',
  },
];

/**
 * Get resolution details by key
 */
export function getResolution(key: ResolutionKey): ResolutionOption | undefined {
  return QUICKCLIP_RESOLUTIONS.find(r => r.key === key);
}

/**
 * Get default resolution (3:4 Portrait - 720p)
 */
export function getDefaultResolution(): ResolutionOption {
  return QUICKCLIP_RESOLUTIONS.find(r => r.key === '3x4_720')!;
}

/**
 * Map resolution key to Seedance dimensions
 */
export function mapResolutionToSeedance(key: ResolutionKey): { width: number; height: number; resolution: string } {
  const resolution = getResolution(key);
  if (!resolution) {
    // Fallback to default
    const defaultRes = getDefaultResolution();
    return {
      width: defaultRes.width,
      height: defaultRes.height,
      resolution: defaultRes.seedanceResolution,
    };
  }
  
  return {
    width: resolution.width,
    height: resolution.height,
    resolution: resolution.seedanceResolution,
  };
}
