// Reference: javascript_object_storage blueprint integration
// Simplified object storage service for community image uploads

import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Object storage client for GCS
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set");
    }
    return dir;
  }

  // Upload a community image to object storage
  async uploadCommunityImage(imageBuffer: Buffer): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const imageId = randomUUID();
    const fullPath = `${privateObjectDir}/community/${imageId}.jpg`;

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    // Upload the image (served privately through our Express endpoint)
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
    });

    // Return the URL path (images served through /objects/... endpoint)
    return `/objects/community/${imageId}.jpg`;
  }

  // Upload a profile image to object storage
  async uploadProfileImage(imageBuffer: Buffer, userId: string, contentType: string = 'image/jpeg'): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const imageId = randomUUID();
    
    // Determine file extension based on content type
    const extension = contentType === 'image/png' ? 'png' : 'jpg';
    const fullPath = `${privateObjectDir}/profiles/${userId}/${imageId}.${extension}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    // Upload the image (served privately through our Express endpoint)
    await file.save(imageBuffer, {
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=86400', // 1 day cache (profile images may change)
      },
    });

    // Return the URL path (images served through /objects/... endpoint)
    return `/objects/profiles/${userId}/${imageId}.${extension}`;
  }

  // Upload a promo video to object storage
  async uploadPromoVideo(videoBuffer: Buffer, promoVideoId: string): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const videoId = randomUUID();
    const fullPath = `${privateObjectDir}/promo-videos/${promoVideoId}/${videoId}.mp4`;

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    // Upload the video (served privately through our Express endpoint)
    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000', // 1 year cache (videos don't change)
      },
    });

    // Return the URL path (videos served through /objects/... endpoint)
    return `/objects/promo-videos/${promoVideoId}/${videoId}.mp4`;
  }

  // Get object file for serving
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    
    return objectFile;
  }

  // Download object to response
  async downloadObject(file: File, res: Response) {
    try {
      const [metadata] = await file.getMetadata();
      
      res.set({
        "Content-Type": metadata.contentType || "image/jpeg",
        "Content-Length": metadata.size,
        "Cache-Control": "public, max-age=31536000",
      });

      const stream = file.createReadStream();
      
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
