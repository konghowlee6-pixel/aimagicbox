/**
 * Cleanup Job: Delete Expired Visuals
 * 
 * This script deletes visuals and campaign images that are older than 60 days.
 * It should be run daily via a cron job or scheduled task.
 */

import { db } from './db';
import { visuals, campaignImages } from '@shared/schema';
import { lt } from 'drizzle-orm';

export async function cleanupExpiredVisuals() {
  console.log('[CLEANUP] Starting expired visuals cleanup job...');
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  try {
    // Delete expired visuals (older than 60 days)
    const deletedVisuals = await db
      .delete(visuals)
      .where(lt(visuals.createdAt, sixtyDaysAgo))
      .returning();
    
    console.log(`[CLEANUP] Deleted ${deletedVisuals.length} expired visuals`);
    
    // Delete expired campaign images (older than 60 days)
    const deletedImages = await db
      .delete(campaignImages)
      .where(lt(campaignImages.createdAt, sixtyDaysAgo))
      .returning();
    
    console.log(`[CLEANUP] Deleted ${deletedImages.length} expired campaign images`);
    
    // Log details of deleted items
    if (deletedVisuals.length > 0) {
      console.log('[CLEANUP] Deleted visual IDs:', deletedVisuals.map(v => v.id).join(', '));
    }
    if (deletedImages.length > 0) {
      console.log('[CLEANUP] Deleted image IDs:', deletedImages.map(i => i.id).join(', '));
    }
    
    console.log('[CLEANUP] Cleanup job completed successfully');
    
    return {
      deletedVisuals: deletedVisuals.length,
      deletedImages: deletedImages.length,
    };
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error);
    throw error;
  }
}

// If run directly (not imported), execute the cleanup
if (require.main === module) {
  cleanupExpiredVisuals()
    .then((result) => {
      console.log('[CLEANUP] Job finished:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[CLEANUP] Job failed:', error);
      process.exit(1);
    });
}
