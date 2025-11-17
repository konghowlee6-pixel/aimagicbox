// Local file storage service for profile images
// This replaces Google Cloud Storage for local development/sandbox environments

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export class LocalFileStorageService {
  private getUploadDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || '/home/ubuntu/aimagicbox/uploads';
    return dir;
  }

  // Upload a profile image to local file system
  async uploadProfileImage(imageBuffer: Buffer, userId: string, contentType: string = 'image/jpeg'): Promise<string> {
    const uploadDir = this.getUploadDir();
    const imageId = randomUUID();
    
    // Determine file extension based on content type
    const extension = contentType === 'image/png' ? 'png' : 'jpg';
    
    // Create directory structure: uploads/profiles/{userId}/
    const userDir = path.join(uploadDir, 'profiles', userId);
    await fs.mkdir(userDir, { recursive: true });
    
    // Save file
    const filename = `${imageId}.${extension}`;
    const filepath = path.join(userDir, filename);
    await fs.writeFile(filepath, imageBuffer);
    
    console.log(`✅ Saved profile image to: ${filepath}`);
    
    // Return the URL path (images served through /uploads/... endpoint)
    return `/uploads/profiles/${userId}/${filename}`;
  }

  // Upload a community image to local file system
  async uploadCommunityImage(imageBuffer: Buffer): Promise<string> {
    const uploadDir = this.getUploadDir();
    const imageId = randomUUID();
    
    // Create directory structure: uploads/community/
    const communityDir = path.join(uploadDir, 'community');
    await fs.mkdir(communityDir, { recursive: true });
    
    // Save file
    const filename = `${imageId}.jpg`;
    const filepath = path.join(communityDir, filename);
    await fs.writeFile(filepath, imageBuffer);
    
    console.log(`✅ Saved community image to: ${filepath}`);
    
    // Return the URL path
    return `/uploads/community/${filename}`;
  }

  // Upload a promo video to local file system
  async uploadPromoVideo(videoBuffer: Buffer, promoVideoId: string): Promise<string> {
    const uploadDir = this.getUploadDir();
    const videoId = randomUUID();
    
    // Create directory structure: uploads/promo-videos/{promoVideoId}/
    const promoDir = path.join(uploadDir, 'promo-videos', promoVideoId);
    await fs.mkdir(promoDir, { recursive: true });
    
    // Save file
    const filename = `${videoId}.mp4`;
    const filepath = path.join(promoDir, filename);
    await fs.writeFile(filepath, videoBuffer);
    
    console.log(`✅ Saved promo video to: ${filepath}`);
    
    // Return the URL path
    return `/uploads/promo-videos/${promoVideoId}/${filename}`;
  }

  // Check if file exists
  async fileExists(urlPath: string): Promise<boolean> {
    if (!urlPath.startsWith('/uploads/')) {
      return false;
    }
    
    const uploadDir = this.getUploadDir();
    const relativePath = urlPath.replace('/uploads/', '');
    const filepath = path.join(uploadDir, relativePath);
    
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  // Get file path from URL path
  getFilePath(urlPath: string): string {
    if (!urlPath.startsWith('/uploads/')) {
      throw new Error('Invalid upload path');
    }
    
    const uploadDir = this.getUploadDir();
    const relativePath = urlPath.replace('/uploads/', '');
    return path.join(uploadDir, relativePath);
  }
}
