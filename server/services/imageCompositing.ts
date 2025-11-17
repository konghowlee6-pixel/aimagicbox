import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export interface CompositeOptions {
  backgroundImagePath: string;
  productImagePath: string;
  placement?: {
    x?: number;  // X position (default: center)
    y?: number;  // Y position (default: center)
    scale?: number;  // Scale factor (default: 0.35)
  };
  lightingAdjustment?: {
    enabled: boolean;
    brightness?: number; // -1.0 to 1.0
    shadowIntensity?: number; // 0.0 to 1.0
  };
}

/**
 * ENHANCED Composite product image onto background image using Sharp
 * Preserves EXACT background dimensions and product appearance
 * Only adds lighting/shadow adjustments for natural integration
 */
export async function compositeProductOntoBackground(
  options: CompositeOptions
): Promise<string> {
  const { backgroundImagePath, productImagePath, placement = {}, lightingAdjustment } = options;
  
  try {
    console.log('🖼️  Starting EXACT-DIMENSION image compositing...');
    console.log(`Background: ${backgroundImagePath}`);
    console.log(`Product: ${productImagePath}`);
    
    // Load background image metadata - PRESERVE EXACT DIMENSIONS
    const backgroundMetadata = await sharp(backgroundImagePath).metadata();
    const bgWidth = backgroundMetadata.width || 1024;
    const bgHeight = backgroundMetadata.height || 1024;
    
    console.log(`✅ Background dimensions (PRESERVED): ${bgWidth}x${bgHeight}`);
    
    // CRITICAL: Use original background buffer WITHOUT any resizing
    const backgroundBuffer = await fs.readFile(backgroundImagePath);
    
    // Load product image
    let productBuffer = await fs.readFile(productImagePath);
    const productMetadata = await sharp(productBuffer).metadata();
    const prodWidth = productMetadata.width || 512;
    const prodHeight = productMetadata.height || 512;
    
    console.log(`Product original dimensions: ${prodWidth}x${prodHeight}`);
    
    // Calculate product dimensions based on background size
    // Cap scale at 0.9 to ensure product never exceeds background bounds
    const requestedScale = placement.scale || 0.35;
    const scale = Math.min(requestedScale, 0.9); // Max 90% of background
    const maxProductWidth = Math.max(1, Math.round(bgWidth * scale));
    const maxProductHeight = Math.max(1, Math.round(bgHeight * scale));
    
    console.log(`🎯 Target product size: max ${maxProductWidth}×${maxProductHeight} (${scale * 100}% of background)`);
    
    // Resize product while maintaining aspect ratio and transparency
    // CRITICAL: This only resizes the product, NOT the background
    let processedProduct = await sharp(productBuffer)
      .resize(maxProductWidth, maxProductHeight, {
        fit: 'inside', // Maintain aspect ratio, fit within bounds
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .toBuffer();
    
    // Get actual dimensions after resize (BEFORE applying effects)
    // This is critical because fit:'inside' may result in smaller dimensions than max
    const resizedMeta = await sharp(processedProduct).metadata();
    const actualWidth = resizedMeta.width || maxProductWidth;
    const actualHeight = resizedMeta.height || maxProductHeight;
    
    console.log(`📏 Actual product size after resize: ${actualWidth}×${actualHeight}`);
    
    // Apply lighting adjustments to product ONLY if requested
    // This preserves product shape/color/texture but adjusts brightness/shadows
    if (lightingAdjustment?.enabled) {
      console.log(`💡 Applying lighting adjustments to product...`);
      
      const brightness = lightingAdjustment.brightness || 0;
      const shadowIntensity = lightingAdjustment.shadowIntensity || 0;
      
      // Apply brightness adjustment (converts to linear, adjusts, converts back)
      if (brightness !== 0) {
        const brightnessMultiplier = 1 + brightness; // -1.0 to 2.0 range
        processedProduct = await sharp(processedProduct)
          .linear(brightnessMultiplier, 0) // Linear adjustment
          .toBuffer();
        
        console.log(`   ✓ Brightness adjusted: ${(brightness * 100).toFixed(0)}%`);
      }
      
      // Apply shadow effect by creating a subtle dark overlay
      // CRITICAL: Use ACTUAL dimensions, not max dimensions
      if (shadowIntensity > 0) {
        const shadowOverlay = Buffer.from(
          `<svg width="${actualWidth}" height="${actualHeight}">
            <rect width="100%" height="100%" fill="black" opacity="${shadowIntensity * 0.3}"/>
          </svg>`
        );
        
        processedProduct = await sharp(processedProduct)
          .composite([{
            input: shadowOverlay,
            blend: 'multiply' // Darkens without losing color
          }])
          .toBuffer();
        
        console.log(`   ✓ Shadow intensity: ${(shadowIntensity * 100).toFixed(0)}%`);
      }
    }
    
    // CRITICAL: placement.x and placement.y are CENTER coordinates, not top-left
    // Convert center coordinates to top-left coordinates for Sharp compositing
    let topLeftX: number;
    let topLeftY: number;
    
    if (placement.x !== undefined && placement.y !== undefined) {
      // Convert center coordinates to top-left
      topLeftX = Math.round(placement.x - actualWidth / 2);
      topLeftY = Math.round(placement.y - actualHeight / 2);
      
      // Ensure product stays fully within background bounds
      topLeftX = Math.max(0, Math.min(topLeftX, bgWidth - actualWidth));
      topLeftY = Math.max(0, Math.min(topLeftY, bgHeight - actualHeight));
      
      console.log(`📍 Center position: (${placement.x}, ${placement.y}) → Top-left: (${topLeftX}, ${topLeftY})`);
    } else {
      // Default to center if no position specified
      topLeftX = Math.round((bgWidth - actualWidth) / 2);
      topLeftY = Math.round((bgHeight - actualHeight) / 2);
      console.log(`📍 Using default center position → Top-left: (${topLeftX}, ${topLeftY})`);
    }
    
    console.log(`📍 Placing product (${actualWidth}×${actualHeight}) with bounds check: X [0-${bgWidth-actualWidth}], Y [0-${bgHeight-actualHeight}]`);
    
    // Composite product onto background
    const outputFilename = `fusion-composite-${Date.now()}.png`;
    const outputPath = path.join(process.cwd(), 'uploads', outputFilename);
    
    // CRITICAL: Use ORIGINAL background buffer (exact dimensions preserved)
    await sharp(backgroundBuffer)
      .composite([{
        input: processedProduct,
        top: topLeftY,
        left: topLeftX,
        blend: 'over' // Alpha blending
      }])
      .png() // Output as PNG to preserve transparency
      .toFile(outputPath);
    
    console.log(`✅ Composite image saved with EXACT background dimensions (${bgWidth}×${bgHeight}): ${outputFilename}`);
    
    return `/uploads/${outputFilename}`;
  } catch (error: any) {
    console.error('Error in image compositing:', error);
    throw new Error(`Image compositing failed: ${error.message}`);
  }
}

/**
 * Generate AI-assisted placement and lighting suggestion using Gemini Vision
 */
export async function suggestProductPlacement(
  backgroundImagePath: string,
  productImagePath: string,
  placementDescription: string
): Promise<{ 
  x: number; 
  y: number; 
  scale: number;
  lightingAdjustment?: {
    enabled: boolean;
    brightness: number;
    shadowIntensity: number;
  }
}> {
  // For now, return intelligent defaults based on image analysis
  // Future enhancement: Use Gemini Vision API to analyze lighting
  const metadata = await sharp(backgroundImagePath).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  
  // Parse placement description for positioning hints
  const desc = placementDescription.toLowerCase();
  let x = Math.round(width * 0.5); // Center by default
  let y = Math.round(height * 0.5);
  let scale = 0.35;
  
  // Simple keyword-based positioning
  if (desc.includes('left')) x = Math.round(width * 0.25);
  if (desc.includes('right')) x = Math.round(width * 0.75);
  if (desc.includes('top')) y = Math.round(height * 0.25);
  if (desc.includes('bottom')) y = Math.round(height * 0.75);
  if (desc.includes('center')) {
    x = Math.round(width * 0.5);
    y = Math.round(height * 0.5);
  }
  
  // Adjust scale based on keywords
  if (desc.includes('large') || desc.includes('prominent')) scale = 0.5;
  if (desc.includes('small') || desc.includes('subtle')) scale = 0.25;
  
  // Default lighting adjustments for natural integration
  const lightingAdjustment = {
    enabled: true,
    brightness: 0, // Neutral brightness
    shadowIntensity: 0.2 // Subtle shadow for depth
  };
  
  return {
    x,
    y,
    scale,
    lightingAdjustment
  };
}

/**
 * Analyze scene with Gemini Vision to get optimal lighting parameters
 */
export async function analyzeLightingForProduct(
  backgroundImagePath: string,
  productImagePath: string
): Promise<{
  brightness: number;
  shadowIntensity: number;
  recommendation: string;
}> {
  // This will be implemented with Gemini Vision API
  // For now, return sensible defaults
  
  // Analyze background brightness using Sharp
  const stats = await sharp(backgroundImagePath).stats();
  const channels = stats.channels;
  
  // Calculate average brightness across RGB channels
  const avgBrightness = channels.reduce((sum, channel) => sum + channel.mean, 0) / channels.length;
  const normalizedBrightness = avgBrightness / 255; // 0-1 range
  
  let brightness = 0;
  let shadowIntensity = 0.2;
  let recommendation = "Neutral lighting with subtle shadows";
  
  // Adjust product brightness to match scene
  if (normalizedBrightness < 0.3) {
    // Dark scene - darken product slightly
    brightness = -0.15;
    shadowIntensity = 0.4;
    recommendation = "Dark scene detected - product darkened with stronger shadows";
  } else if (normalizedBrightness > 0.7) {
    // Bright scene - brighten product slightly
    brightness = 0.1;
    shadowIntensity = 0.1;
    recommendation = "Bright scene detected - product brightened with subtle shadows";
  }
  
  console.log(`📊 Scene brightness analysis: ${(normalizedBrightness * 100).toFixed(0)}%`);
  console.log(`💡 Lighting recommendation: ${recommendation}`);
  
  return {
    brightness,
    shadowIntensity,
    recommendation
  };
}
