import axios from 'axios';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { enforceEthnicConsistency } from '../promptUtils';

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;
const RUNWARE_API_URL = 'https://api.runware.ai/v1';

if (!RUNWARE_API_KEY) {
  throw new Error('RUNWARE_API_KEY environment variable is not set. Please configure your Runware API key in Secrets.');
}

interface RunwareImageRequest {
  positivePrompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numberResults?: number;
  outputType?: string;
  outputFormat?: string;
  includeCost?: boolean;
}

interface RunwareImageResponse {
  data: Array<{
    imageURL: string;
    imageUUID: string;
    cost?: number;
  }>;
}

interface PromptEnhanceRequest {
  prompt: string;
  promptMaxLength?: number;
  promptVersions?: number;
}

interface CaptionRequest {
  imageURL: string;
}

/**
 * Generate images using Runware AI
 */
export async function generateRunwareImages(
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number,
  numberOfImages: number = 3
): Promise<string[]> {
  try {
    // Enforce Southeast Asian ethnic consistency
    const { positivePrompt: enhancedPrompt, negativePrompt: enhancedNegative } = enforceEthnicConsistency(
      prompt || '__BLANK__',
      negativePrompt || 'text, words, letters, numbers, logos, watermarks, signatures'
    );

    const payload = [
      {
        taskType: 'imageInference',
        taskUUID: randomUUID(),
        positivePrompt: enhancedPrompt,
        negativePrompt: enhancedNegative,
        width,
        height,
        numberResults: numberOfImages,
        outputType: 'URL',
        outputFormat: 'JPEG',
        model: 'rundiffusion:130@100', // Juggernaut Pro FLUX - best photorealistic model
        steps: 25, // Reduced from 33 for faster generation
        scheduler: 'Euler Beta',
        CFGScale: 3,
        includeCost: true,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Runware image generation successful');
    console.log('📦 Raw response.data:', JSON.stringify(response.data, null, 2));
    console.log('📦 Type of response.data:', typeof response.data);
    console.log('📦 Is array?:', Array.isArray(response.data));

    // Handle different possible response structures
    let responseData: any[] = [];

    // Case 1: Direct array of results
    if (Array.isArray(response.data)) {
      responseData = response.data;
      console.log('📦 Case 1: Direct array, length:', responseData.length);
    }
    // Case 2: Nested data property { data: [...] }
    else if (response.data?.data && Array.isArray(response.data.data)) {
      responseData = response.data.data;
      console.log('📦 Case 2: Nested data array, length:', responseData.length);
    }
    // Case 3: Single object result
    else if (response.data && typeof response.data === 'object') {
      responseData = [response.data];
      console.log('📦 Case 3: Single object wrapped in array');
    }

    console.log('📦 Final responseData length:', responseData.length);
    console.log('📦 First item keys:', responseData[0] ? Object.keys(responseData[0]) : 'none');

    // Extract image URLs - handle various field name formats
    const images: string[] = [];
    for (const item of responseData) {
      // Try different possible field names
      const imageUrl = item?.imageURL || item?.image_url || item?.imageUrl || item?.url;

      console.log('🔍 Processing item:', {
        hasImageURL: !!item?.imageURL,
        hasImage_url: !!item?.image_url,
        hasImageUrl: !!item?.imageUrl,
        hasUrl: !!item?.url,
        extractedUrl: imageUrl,
        allKeys: Object.keys(item || {})
      });

      if (imageUrl && typeof imageUrl === 'string') {
        console.log('✅ Found image URL:', imageUrl);
        images.push(imageUrl);
      }
    }

    console.log('📸 Total images extracted:', images.length);
    console.log('📸 Image URLs:', images);

    if (images.length === 0) {
      console.error('❌ No images found in response. Full response:', JSON.stringify(response.data, null, 2));
      throw new Error('No image URLs returned from Runware API');
    }

    return images;
  } catch (error: any) {
    console.error('❌ Runware image generation failed:', error.response?.data || error.message);
    throw new Error(`Runware image generation failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Enhance prompt using Runware Prompt Enhancer API
 */
export async function enhanceRunwarePrompt(
  prompt: string,
  maxLength: number = 380,
  versions: number = 1
): Promise<string[]> {
  try {
    const payload = [
      {
        taskType: 'promptEnhance',
        taskUUID: randomUUID(),
        prompt: prompt,
        promptMaxLength: maxLength,
        promptVersions: versions,
        includeCost: true,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Runware prompt enhancement successful');

    // Handle response - data might be an object or array
    const responseData = Array.isArray(response.data) ? response.data : [response.data];

    // Extract enhanced prompts
    const enhancedPrompts = responseData
      .filter((item: any) => item && item.text)
      .map((item: any) => item.text);

    return enhancedPrompts.length > 0 ? enhancedPrompts : [prompt];
  } catch (error: any) {
    console.error('❌ Runware prompt enhancement failed:', error.response?.data || error.message);
    // Return original prompt as fallback
    return [prompt];
  }
}

/**
 * Generate caption for an image using Runware Caption API
 */
export async function generateRunwareCaption(imageURL: string): Promise<string> {
  try {
    const payload = [
      {
        taskType: 'imageCaption',
        taskUUID: randomUUID(),
        imageURL: imageURL,
        includeCost: true,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 second timeout for image processing
    });

    console.log('✅ Runware caption generation successful');

    // Extract caption from response with validation
    const captions = response.data
      .filter((item: any) => item && item.text && typeof item.text === 'string')
      .map((item: any) => item.text.trim());

    if (captions.length === 0) {
      throw new Error('No caption returned from API');
    }

    return captions[0];
  } catch (error: any) {
    console.error('❌ Runware caption generation failed:', error.response?.data || error.message);

    // Provide more specific error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Caption generation timed out. Please try again.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid image URL. Please upload a valid image.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Caption generation failed');
  }
}

/**
 * Generate fusion visual background using Runware AI
 * Creates a professional marketing background suitable for product placement
 */
export async function generateRunwareFusionBackground(
  backgroundPrompt: string,
  width: number = 1024,
  height: number = 1024
): Promise<string> {
  try {
    // Create a fusion-optimized prompt for product photography backgrounds
    const fusionPrompt = `Professional marketing visual background for: ${backgroundPrompt}. 
Clean, well-lit background suitable for product placement in the foreground. 
Visually appealing, complementary to product photography, professional studio quality.`;

    const baseNegativePrompt = 'text, words, letters, numbers, logos, watermarks, signatures, labels, titles, product, object in foreground';

    // Enforce Southeast Asian ethnic consistency
    const { positivePrompt: enhancedPrompt, negativePrompt: enhancedNegative } = enforceEthnicConsistency(
      fusionPrompt,
      baseNegativePrompt
    );

    const payload = [
      {
        taskType: 'imageInference',
        taskUUID: randomUUID(),
        positivePrompt: enhancedPrompt,
        negativePrompt: enhancedNegative,
        width,
        height,
        numberResults: 1,
        outputType: 'URL',
        outputFormat: 'PNG',
        model: 'rundiffusion:130@100', // Juggernaut Pro FLUX - best photorealistic model
        steps: 25, // Reduced from 33 for faster generation
        scheduler: 'Euler Beta',
        CFGScale: 3,
        includeCost: true,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Runware fusion background generation successful');

    // Handle response - data might be an object or array
    const responseData = Array.isArray(response.data) ? response.data : [response.data];

    // Extract the first image URL
    const images = responseData
      .filter((item: any) => item && item.imageURL)
      .map((item: any) => item.imageURL);

    if (images.length === 0) {
      console.error('No background found in response:', response.data);
      throw new Error('No background image generated');
    }

    return images[0];
  } catch (error: any) {
    console.error('❌ Runware fusion background generation failed:', error.response?.data || error.message);
    throw new Error(`Runware fusion background generation failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Remove background from product image using Runware AI
 * This prepares the product for fusion with a custom background
 */
export async function removeImageBackground(imageURL: string): Promise<string> {
  try {
    const payload = [
      {
        taskType: 'removeBackground',
        taskUUID: randomUUID(),
        inputImage: imageURL,
        outputType: 'URL',
        outputFormat: 'PNG',
        includeCost: true,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Runware background removal successful');

    // Handle response
    const responseData = Array.isArray(response.data) ? response.data : [response.data];

    // Extract the processed image URL
    const images = responseData
      .filter((item: any) => item && item.imageURL)
      .map((item: any) => item.imageURL);

    if (images.length === 0) {
      console.error('No processed image found in response:', response.data);
      throw new Error('Background removal failed - no image returned');
    }

    return images[0];
  } catch (error: any) {
    console.error('❌ Runware background removal failed:', error.response?.data || error.message);
    throw new Error(`Background removal failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Composite a background-removed product image onto a background using Sharp
 * This provides pixel-perfect layering without AI degradation
 */
export async function fuseProductWithBackground(
  backgroundRemovedProductURL: string,
  backgroundImageURL: string,
  productDescription: string,
  width: number = 1024,
  height: number = 1024
): Promise<Buffer> {
  try {
    console.log('🎨 Starting Sharp-based image compositing...');

    // Download both images
    const [productResponse, backgroundResponse] = await Promise.all([
      axios.get(backgroundRemovedProductURL, { responseType: 'arraybuffer' }),
      axios.get(backgroundImageURL, { responseType: 'arraybuffer' }),
    ]);

    const productBuffer = Buffer.from(productResponse.data);
    const backgroundBuffer = Buffer.from(backgroundResponse.data);

    console.log('✅ Downloaded product and background images');

    // Resize product to fit within background (maintain aspect ratio)
    const productImage = sharp(productBuffer);
    const productMeta = await productImage.metadata();

    // Calculate scaled dimensions (max 80% of background size)
    const maxProductWidth = Math.floor(width * 0.8);
    const maxProductHeight = Math.floor(height * 0.8);

    let resizedWidth = productMeta.width || width;
    let resizedHeight = productMeta.height || height;

    if (resizedWidth > maxProductWidth || resizedHeight > maxProductHeight) {
      const widthRatio = maxProductWidth / resizedWidth;
      const heightRatio = maxProductHeight / resizedHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      resizedWidth = Math.floor(resizedWidth * ratio);
      resizedHeight = Math.floor(resizedHeight * ratio);
    }

    // Resize product with transparent background preserved
    const resizedProduct = await productImage
      .resize(resizedWidth, resizedHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png() // Ensure PNG format to preserve transparency
      .toBuffer();

    console.log(`✅ Resized product to ${resizedWidth}x${resizedHeight}`);

    // Center the product on the background
    const left = Math.floor((width - resizedWidth) / 2);
    const top = Math.floor((height - resizedHeight) / 2);

    // Composite product onto background
    const fusedImage = await sharp(backgroundBuffer)
      .resize(width, height, { fit: 'cover' })
      .composite([
        {
          input: resizedProduct,
          top: top,
          left: left,
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log('✅ Successfully composited product onto background');

    return fusedImage;
  } catch (error: any) {
    console.error('❌ Sharp compositing failed:', error.message);
    throw new Error(`Image compositing failed: ${error.message}`);
  }
}

/**
 * Fuse multiple images using Gemini 2.5 Flash Image (AI-powered intelligent fusion)
 * Supports 2-8 reference images with natural language fusion instructions
 */
export async function fuseImagesWithGemini(
  referenceImages: string[],
  fusionPrompt: string,
  width: number = 1024,
  height: number = 1024
): Promise<{ imageUrl: string; cost: number }> {
  try {
    // Validate inputs
    if (!referenceImages || referenceImages.length < 2 || referenceImages.length > 8) {
      throw new Error('Gemini fusion requires 2-8 reference images');
    }

    if (!fusionPrompt || fusionPrompt.trim().length === 0) {
      throw new Error('Fusion prompt is required for Gemini fusion');
    }

    // Normalize dimensions to multiples of 64 (Runware requirement)
    const normalizedWidth = Math.max(128, Math.min(2048, Math.ceil(width / 64) * 64));
    const normalizedHeight = Math.max(128, Math.min(2048, Math.ceil(height / 64) * 64));

    console.log(`🎨 Starting Gemini multi-image fusion with ${referenceImages.length} images...`);
    console.log(`📐 Dimensions: ${normalizedWidth}x${normalizedHeight}`);
    console.log(`💬 Fusion prompt: ${fusionPrompt}`);

    const payload = [
      {
        taskType: 'imageInference',
        taskUUID: randomUUID(),
        model: 'google:4@1', // Gemini 2.5 Flash Image (Nano Banana)
        referenceImages: referenceImages,
        positivePrompt: fusionPrompt,
        width: normalizedWidth,
        height: normalizedHeight,
        numberResults: 1,
        outputType: 'URL',
        outputFormat: 'PNG',
        includeCost: true,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 0, // No timeout limit
    });

    console.log('✅ Gemini fusion successful');

    // Handle response - Runware wraps results in { data: [...] }
    const responseData = response.data.data || response.data;
    const resultsArray = Array.isArray(responseData) ? responseData : [responseData];

    // Extract the first image URL and cost
    const firstResult = resultsArray.find((item: any) => item && item.imageURL);

    if (!firstResult || !firstResult.imageURL) {
      console.error('No fused image found in response:', response.data);
      throw new Error('Gemini fusion failed - no image returned');
    }

    const fusedImageURL = firstResult.imageURL;

    // Extract cost from Runware response
    // Per Runware API docs: cost field is returned in dollars (not cents)
    // Example: cost: 0.027 = $0.027 = 2.7 cents
    let costInCents = 3; // Default to 3 cents if not provided
    if (firstResult.cost !== undefined && firstResult.cost !== null) {
      const rawCostInDollars = firstResult.cost;
      console.log(`💰 Raw cost from Runware: $${rawCostInDollars}`);

      // Convert from dollars to cents (Runware uses dollars, we store cents)
      costInCents = Math.ceil(rawCostInDollars * 100);
      console.log(`📊 Converted to cents: $${rawCostInDollars} → ${costInCents}¢`);

      // Sanity checks for defensive programming
      if (costInCents < 1) {
        console.warn(`⚠️ WARNING: Cost < 1¢ detected (${costInCents}¢). Defaulting to 3¢.`);
        costInCents = 3;
      } else if (costInCents > 500) {
        console.warn(`⚠️ WARNING: Unusually high cost detected: ${costInCents}¢. Please verify.`);
      }
    }

    console.log(`🖼️ Gemini fused image URL: ${fusedImageURL}`);
    console.log(`💰 Final cost: ${costInCents}¢`);

    return { imageUrl: fusedImageURL, cost: costInCents };
  } catch (error: any) {
    console.error('❌ Gemini fusion failed:', error.response?.data || error.message);

    // Provide specific error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Gemini fusion timed out. Please try again with simpler images.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid fusion request. Please check your images and prompt.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Gemini fusion failed');
  }
}

/**
 * Normalize image dimensions for Runware API (must be multiples of 64, between 128-2048)
 * Uses ceil-to-64 logic with padding to avoid distortion
 */
async function normalizeImageForRunware(
  imageDataUrl: string,
  targetWidth: number,
  targetHeight: number,
  options?: { forOutpainting?: boolean }
): Promise<{ dataUrl: string; width: number; height: number }> {
  // Calculate normalized dimensions (ceil to nearest 64, clamped 128-2048)
  const normalizedWidth = Math.max(128, Math.min(2048, Math.ceil(targetWidth / 64) * 64));
  const normalizedHeight = Math.max(128, Math.min(2048, Math.ceil(targetHeight / 64) * 64));

  // If dimensions already valid, return as-is
  if (normalizedWidth === targetWidth && normalizedHeight === targetHeight) {
    return { dataUrl: imageDataUrl, width: targetWidth, height: targetHeight };
  }

  console.log(`🔧 Normalizing image from ${targetWidth}×${targetHeight} to ${normalizedWidth}×${normalizedHeight}`);

  // Decode base64 image
  const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // For outpainting: use 'cover' to crop/fill edges instead of adding transparent padding
  // This ensures the AI has real pixel data at edges, not blank margins
  const fitMode = options?.forOutpainting ? 'cover' : 'contain';
  const background = options?.forOutpainting 
    ? { r: 255, g: 255, b: 255, alpha: 1 } // White background for outpainting (won't be visible after crop)
    : { r: 0, g: 0, b: 0, alpha: 0 };      // Transparent for other operations

  console.log(`📐 Using fit mode: ${fitMode} ${options?.forOutpainting ? '(outpainting mode - preserving edge context)' : ''}`);

  const resizedBuffer = await sharp(imageBuffer)
    .resize({
      width: normalizedWidth,
      height: normalizedHeight,
      fit: fitMode,
      background: background,
      position: 'center' // Center crop when using 'cover'
    })
    .png()
    .toBuffer();

  const normalizedDataUrl = `data:image/png;base64,${resizedBuffer.toString('base64')}`;

  return {
    dataUrl: normalizedDataUrl,
    width: normalizedWidth,
    height: normalizedHeight
  };
}

/**
 * Detect if the user prompt indicates object removal/erasure
 */
function isRemovalOperation(prompt?: string): boolean {
  if (!prompt) return false;
  const lowerPrompt = prompt.toLowerCase();
  const removalKeywords = ['remove', 'erase', 'delete', 'clear', 'eliminate', 'get rid of'];
  return removalKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Enhance prompt for removal operations without clobbering user intent
 * Adds removal-specific guidance while preserving user's replacement instructions
 */
function enhanceRemovalPrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Check if user provided replacement instructions (e.g., "replace with", "add", "put")
  const hasReplacementIntent = /replace with|add|put|insert|change to|swap with/i.test(prompt);

  if (hasReplacementIntent) {
    // User specified what should replace the removed object - preserve their intent
    console.log('🎯 User provided replacement instructions - preserving original prompt');
    return prompt;
  }

  // Detect what's being removed to add helpful context
  const objectMappings: Record<string, string> = {
    'watch': 'clean skin, natural wrist, bare arm, no accessories',
    'bracelet': 'clean skin, natural wrist, bare arm, no jewelry',
    'necklace': 'clean neck, natural skin, no jewelry',
    'ring': 'clean fingers, natural hand, bare fingers, no jewelry',
    'logo': 'plain surface, clean background, no text, no branding',
    'text': 'clean background, plain surface, no writing, no lettering',
    'watermark': 'clean background, plain surface, no text, no branding',
    'person': 'empty space, natural background, clean scene',
    'object': 'empty space, natural background, clean surface',
    'background': 'clean background, simple backdrop, plain surface',
  };

  // Find matching object type and suggest appropriate clean state
  for (const [object, cleanState] of Object.entries(objectMappings)) {
    if (lowerPrompt.includes(object)) {
      console.log(`🎯 Detected removal of "${object}" - adding clean state guidance: "${cleanState}"`);
      // Prepend clean state guidance while keeping original prompt
      return `${cleanState}, ${prompt}`;
    }
  }

  // Generic removal guidance if no specific object detected
  console.log('🎯 Generic removal operation - adding clean background guidance');
  return `clean background, natural surface, seamless, ${prompt}`;
}

/**
 * Generate inpainted image using Runware FLUX Fill Inpainting API
 * @param seedImageDataUrl - The original image as base64 data URL
 * @param maskImageDataUrl - The mask image as base64 data URL (white = edit, transparent/black = preserve)
 * @param prompt - Optional text description for the inpainted area
 * @param negativePrompt - Optional negative prompt to exclude elements
 * @param width - Image width
 * @param height - Image height
 */
export async function generateInpaintedImage(
  seedImageDataUrl: string,
  maskImageDataUrl: string,
  prompt?: string,
  negativePrompt?: string,
  providedWidth?: number,
  providedHeight?: number
): Promise<string> {
  try {
    console.log('🎨 Generating inpainted image with Runware FLUX Fill Inpainting API...');
    console.log('📝 Original prompt:', prompt);

    // Extract dimensions from image if not provided
    let originalWidth = providedWidth;
    let originalHeight = providedHeight;

    if (!originalWidth || !originalHeight) {
      const imageBase64 = seedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const metadata = await sharp(imageBuffer).metadata();
      originalWidth = metadata.width!;
      originalHeight = metadata.height!;
      console.log('📐 Original dimensions:', originalWidth, 'x', originalHeight);
    } else {
      console.log('📐 Provided dimensions:', originalWidth, 'x', originalHeight);
    }

    // Normalize both seed and mask to Runware-compatible dimensions
    const normalizedSeed = await normalizeImageForRunware(seedImageDataUrl, originalWidth, originalHeight);
    const normalizedMask = await normalizeImageForRunware(maskImageDataUrl, originalWidth, originalHeight);

    console.log('✅ Images normalized to:', normalizedSeed.width, 'x', normalizedSeed.height);

    // Intelligently enhance prompt for removal operations
    let optimizedPrompt: string;
    if (isRemovalOperation(prompt)) {
      optimizedPrompt = enhanceRemovalPrompt(prompt || '');
      console.log('🎯 Removal operation detected - enhanced prompt:', optimizedPrompt);
    } else {
      optimizedPrompt = prompt || 'natural, seamless, photorealistic';
    }

    // Enhanced negative prompt for inpainting (especially removal operations)
    const baseNegativePrompt = negativePrompt 
      ? `${negativePrompt}, artifacts, remnants, ghosting, object remnants, shadows, inconsistent lighting, blur, distortion, low quality, deformed, watermark, text`
      : 'artifacts, remnants, ghosting, object remnants, shadows, inconsistent lighting, blur, distortion, low quality, deformed, watermark, text, blurry';

    // Enforce Southeast Asian ethnic consistency
    const { positivePrompt: ethnicPrompt, negativePrompt: ethnicNegative } = enforceEthnicConsistency(
      optimizedPrompt,
      baseNegativePrompt
    );

    // Generate unique task UUID (must be valid UUIDv4 format)
    const { randomUUID } = await import('crypto');
    const taskUUID = randomUUID();

    // FLUX Fill (runware:102@1) payload - optimized for inpainting
    // NOTE: FLUX Fill does NOT use strength or CFGScale parameters (auto-optimized)
    const payload = [
      {
        taskType: 'imageInference',
        taskUUID: taskUUID,
        model: 'runware:102@1', // FLUX Fill - dedicated inpainting model
        positivePrompt: ethnicPrompt,
        negativePrompt: ethnicNegative,
        seedImage: normalizedSeed.dataUrl,
        maskImage: normalizedMask.dataUrl,
        width: normalizedSeed.width,
        height: normalizedSeed.height,
        steps: 30,
        outputType: 'URL',
        outputFormat: 'png',
        numberResults: 1,
      }
    ];

    console.log('📦 Inpainting task payload:', {
      taskUUID: taskUUID,
      model: payload[0].model,
      optimizedPrompt: payload[0].positivePrompt,
      negativePrompt: payload[0].negativePrompt,
      size: `${normalizedSeed.width}x${normalizedSeed.height}`,
    });

    const response = await axios.post(
      RUNWARE_API_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${RUNWARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout for image processing
      }
    );

    console.log('✅ Runware inpainting successful');
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));

    // Extract image URL from response (Runware returns data array)
    let imageUrl: string | null = null;

    if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const result = response.data.data[0];
      imageUrl = result.imageURL || result.image_url || result.url;
    } else if (response.data?.imageURL) {
      imageUrl = response.data.imageURL;
    } else if (response.data?.image_url) {
      imageUrl = response.data.image_url;
    }

    if (!imageUrl) {
      console.error('❌ No image URL in response:', response.data);
      throw new Error('No image URL returned from Runware inpainting API');
    }

    console.log('✅ Inpainted image URL:', imageUrl);
    return imageUrl;

  } catch (error: any) {
    console.error('❌ Runware inpainting failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.code === 'ECONNABORTED') {
      throw new Error('Inpainting timed out. Please try again with a smaller image or simpler mask.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your Runware API key.');
    }
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.error || 'Invalid request';
      throw new Error(`Inpainting request invalid: ${errorMsg}. Please check your image and mask format.`);
    }

    throw new Error(`Inpainting failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Transform an image using AI-powered style transfer
 * @param seedImageDataUrl - The original image as base64 data URL
 * @param transformPrompt - Description of the desired transformation/style
 * @param strength - How much to transform (0-100, where 0=fully stylized, 100=more original)
 * @param negativePrompt - Optional negative prompt to exclude elements
 * @param providedWidth - Original image width (optional)
 * @param providedHeight - Original image height (optional)
 * @returns URL of the transformed image
 */
export async function generateImage2ImageTransformation(
  seedImageDataUrl: string,
  transformPrompt: string,
  strength: number = 70,
  negativePrompt?: string,
  providedWidth?: number,
  providedHeight?: number
): Promise<string> {
  try {
    console.log('🎨 Generating image-to-image transformation with Runware...');
    console.log('💬 Transform prompt:', transformPrompt);
    console.log('🎚️ Style strength:', strength);

    // Extract dimensions from image if not provided
    let originalWidth = providedWidth;
    let originalHeight = providedHeight;

    if (!originalWidth || !originalHeight) {
      const imageBase64 = seedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const metadata = await sharp(imageBuffer).metadata();
      originalWidth = metadata.width!;
      originalHeight = metadata.height!;
      console.log('📐 Original image dimensions:', originalWidth, 'x', originalHeight);
    }

    // Normalize image to Runware-compatible dimensions
    const normalizedSeed = await normalizeImageForRunware(seedImageDataUrl, originalWidth, originalHeight);
    console.log('✅ Image normalized to:', normalizedSeed.width, 'x', normalizedSeed.height);

    // Convert strength (0-100 slider) to Runware strength parameter (0.0-1.0)
    // Per Runware docs:
    //   - Lower strength (0.0-0.3): Preserve original, minor adjustments
    //   - Medium strength (0.4-0.6): Balanced transformation
    //   - Higher strength (0.7-1.0): Major changes, strong stylization
    // Direct mapping: UI slider → API strength (no inversion needed)
    // Clamp to safe range 0.05-0.95 to avoid edge cases
    const apiStrength = Math.min(Math.max(strength / 100, 0.05), 0.95);
    console.log(`🎚️ Converted UI strength ${strength} to API strength ${apiStrength.toFixed(2)}`);

    // Enhanced negative prompt for image-to-image
    const baseNegativePrompt = negativePrompt 
      ? `${negativePrompt}, distorted, deformed, low quality, blurry, artifacts, watermark, text`
      : 'distorted, deformed, low quality, blurry, artifacts, watermark, text, ugly, bad anatomy';

    // Enforce Southeast Asian ethnic consistency
    const { positivePrompt: ethnicPrompt, negativePrompt: ethnicNegative } = enforceEthnicConsistency(
      transformPrompt,
      baseNegativePrompt
    );

    // Generate task UUID
    const taskUUID = randomUUID();

    // FLUX.1 Dev payload for high-quality image-to-image transformation
    const payload = [
      {
        taskType: 'imageInference',
        taskUUID: taskUUID,
        model: 'runware:101@1', // FLUX.1 Dev - supports img2img with seedImage + strength
        seedImage: normalizedSeed.dataUrl,
        positivePrompt: ethnicPrompt,
        negativePrompt: ethnicNegative,
        strength: apiStrength,
        steps: 20,
        width: normalizedSeed.width,
        height: normalizedSeed.height,
        outputType: 'URL',
        outputFormat: 'JPEG',
        includeCost: true,
      }
    ];

    console.log('📦 Image2Image task payload:', {
      taskUUID,
      model: payload[0].model,
      prompt: payload[0].positivePrompt,
      strength: payload[0].strength,
      size: `${normalizedSeed.width}x${normalizedSeed.height}`,
    });

    const response = await axios.post(
      RUNWARE_API_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${RUNWARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout
      }
    );

    console.log('✅ Runware image-to-image transformation successful');

    // Extract image URL from response
    let imageUrl: string | null = null;

    if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const result = response.data.data[0];
      imageUrl = result.imageURL || result.image_url || result.url;
    } else if (response.data?.imageURL) {
      imageUrl = response.data.imageURL;
    } else if (response.data?.image_url) {
      imageUrl = response.data.image_url;
    }

    if (!imageUrl) {
      console.error('❌ No image URL in response:', response.data);
      throw new Error('No image URL returned from Runware image-to-image API');
    }

    console.log('✅ Transformed image URL:', imageUrl);
    return imageUrl;

  } catch (error: any) {
    console.error('❌ Runware image-to-image transformation failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.code === 'ECONNABORTED') {
      throw new Error('Transformation timed out. Please try again with a smaller image.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your Runware API key.');
    }
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.error || 'Invalid request';
      throw new Error(`Transformation request invalid: ${errorMsg}`);
    }

    throw new Error(`Image transformation failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Generate outpainted image using Runware Outpainting API
 * Uses the official outpaint parameter for efficient and seamless image expansion
 * @param seedImageDataUrl - The original image as base64 data URL
 * @param directions - Object specifying which directions to expand { left, right, top, bottom }
 * @param prompt - Optional text description for the extended areas
 * @param negativePrompt - Optional negative prompt to exclude elements
 * @param providedWidth - Original image width (optional)
 * @param providedHeight - Original image height (optional)
 */
export async function generateOutpaintedImage(
  seedImageDataUrl: string,
  directions: { left: boolean; right: boolean; top: boolean; bottom: boolean },
  prompt?: string,
  negativePrompt?: string,
  providedWidth?: number,
  providedHeight?: number
): Promise<string> {
  try {
    console.log('🖼️ Generating outpainted image with Runware Outpainting API...');

    // Extract dimensions from image if not provided
    let originalWidth = providedWidth;
    let originalHeight = providedHeight;

    if (!originalWidth || !originalHeight) {
      const imageBase64 = seedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const metadata = await sharp(imageBuffer).metadata();
      originalWidth = metadata.width!;
      originalHeight = metadata.height!;
      console.log('📐 Original image dimensions:', originalWidth, 'x', originalHeight);
    } else {
      console.log('📐 Using provided dimensions:', originalWidth, 'x', originalHeight);
    }

    // Normalize original image to Runware-compatible dimensions (128-2048px, multiples of 64)
    // Use 'cover' mode for outpainting to preserve edge content instead of adding blank padding
    const normalizedSeed = await normalizeImageForRunware(seedImageDataUrl, originalWidth, originalHeight, { forOutpainting: true });
    console.log('✅ Seed image normalized to:', normalizedSeed.width, 'x', normalizedSeed.height, '(outpainting mode)');

    // Expansion size: MUST be multiple of 64 per Runware requirements
    const baseExpansionSize = 128;

    // Calculate expansion amounts for each direction (each must be multiple of 64)
    // Use fixed 128px per direction to guarantee multiples of 64
    const leftExpansion = directions.left ? baseExpansionSize : 0;
    const rightExpansion = directions.right ? baseExpansionSize : 0;
    const topExpansion = directions.top ? baseExpansionSize : 0;
    const bottomExpansion = directions.bottom ? baseExpansionSize : 0;

    // Calculate final canvas dimensions (guaranteed multiples of 64 since seed and expansions are multiples of 64)
    const finalWidth = normalizedSeed.width + leftExpansion + rightExpansion;
    const finalHeight = normalizedSeed.height + topExpansion + bottomExpansion;

    // Validate final dimensions are within Runware limits (128-2048px)
    if (finalWidth < 128 || finalWidth > 2048 || finalHeight < 128 || finalHeight > 2048) {
      throw new Error(`Outpainting would result in invalid dimensions (${finalWidth}x${finalHeight}). Dimensions must be between 128-2048px. Please use a smaller image or fewer expansion directions.`);
    }

    // Verify all dimensions are multiples of 64 (safety check)
    if (finalWidth % 64 !== 0 || finalHeight % 64 !== 0) {
      throw new Error(`Internal error: Final dimensions (${finalWidth}x${finalHeight}) are not multiples of 64. This should never happen.`);
    }

    // Build outpaint object with expansion values (Runware official API parameter)
    // All values are guaranteed to be multiples of 64
    const outpaintConfig: Record<string, number> = {};
    if (directions.left) outpaintConfig.left = leftExpansion;
    if (directions.right) outpaintConfig.right = rightExpansion;
    if (directions.top) outpaintConfig.top = topExpansion;
    if (directions.bottom) outpaintConfig.bottom = bottomExpansion;
    outpaintConfig.blur = 16; // Higher blur for seamless transitions

    // Build directions list for logging
    const directionsList: string[] = [];
    if (directions.left) directionsList.push(`left:${leftExpansion}px`);
    if (directions.right) directionsList.push(`right:${rightExpansion}px`);
    if (directions.top) directionsList.push(`top:${topExpansion}px`);
    if (directions.bottom) directionsList.push(`bottom:${bottomExpansion}px`);

    console.log('📍 Expansion directions:', directionsList.join(', '));
    console.log('📐 Final canvas dimensions:', finalWidth, 'x', finalHeight);
    console.log('📊 Expansion calculation:', {
      seedSize: `${normalizedSeed.width}x${normalizedSeed.height}`,
      finalSize: `${finalWidth}x${finalHeight}`,
      expansions: outpaintConfig
    });

    // Enforce Southeast Asian ethnic consistency (only positive prompt, model doesn't support negative)
    const { positivePrompt: ethnicPrompt } = enforceEthnicConsistency(
      prompt || 'natural scene, seamless extension, photorealistic, consistent lighting'
    );

    // Generate unique task UUID (must be valid UUIDv4 format)
    const { randomUUID } = await import('crypto');
    const taskUUID = randomUUID();

    // Runware official outpainting API payload (using outpaint parameter)
    // Using FLUX Fill (runware:102@1) for best boundary-aware generation
    const payload = [
      {
        taskType: 'imageInference',
        taskUUID: taskUUID,
        model: 'runware:102@1', // FLUX Fill - specifically designed for seamless outpainting
        positivePrompt: ethnicPrompt,
        negativePrompt: negativePrompt || 'blurry, bad quality, distorted, artifacts, seams',
        seedImage: normalizedSeed.dataUrl,
        outpaint: outpaintConfig, // Official Runware outpaint parameter
        width: finalWidth, // CRITICAL: Must specify final dimensions when using outpaint
        height: finalHeight, // CRITICAL: Must specify final dimensions when using outpaint
        steps: 30, // Optimized for faster generation (was 40)
        strength: 0.9, // Recommended 0.85-0.95 for outpainting
        outputType: 'URL',
        outputFormat: 'PNG',
        numberResults: 1,
      }
    ];

    console.log('📦 Outpainting task payload:', {
      taskUUID: taskUUID,
      model: payload[0].model,
      directions: directionsList,
      originalSize: `${normalizedSeed.width}x${normalizedSeed.height}`,
      finalSize: `${finalWidth}x${finalHeight}`,
      outpaint: outpaintConfig,
      prompt: payload[0].positivePrompt,
    });

    const response = await axios.post(
      RUNWARE_API_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${RUNWARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout for image processing
      }
    );

    console.log('✅ Runware outpainting successful');
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));

    // Extract image URL from response (Runware returns data array)
    let imageUrl: string | null = null;

    if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const result = response.data.data[0];
      imageUrl = result.imageURL || result.image_url || result.url;
    } else if (response.data?.imageURL) {
      imageUrl = response.data.imageURL;
    } else if (response.data?.image_url) {
      imageUrl = response.data.image_url;
    }

    if (!imageUrl) {
      console.error('❌ No image URL in response:', response.data);
      throw new Error('No image URL returned from Runware outpainting API');
    }

    console.log('✅ Outpainted image URL:', imageUrl);
    return imageUrl;

  } catch (error: any) {
    console.error('❌ Runware outpainting failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.code === 'ECONNABORTED') {
      throw new Error('Outpainting timed out. Please try again with a smaller image.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your Runware API key.');
    }
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.error || 'Invalid request';
      throw new Error(`Outpainting request invalid: ${errorMsg}. Please check your image format and directions.`);
    }

    throw new Error(`Outpainting failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Upscale an image using Runware Upscale API
 * 
 * @param imageDataUrl - Base64 data URL of the image to upscale
 * @param upscaleFactor - Upscale multiplier (default: 2x)
 * @returns Data URI of the upscaled image
 */
export async function upscaleImage(
  imageDataUrl: string,
  upscaleFactor: number = 2
): Promise<string> {
  try {
    console.log('🔍 Upscaling image with Runware Upscale API...');
    console.log('📊 Upscale factor:', upscaleFactor);

    const payload = [
      {
        taskType: 'imageUpscale',
        taskUUID: randomUUID(),
        inputImage: imageDataUrl,
        upscaleFactor,
        outputType: 'dataURI',
        outputFormat: 'PNG',
        includeCost: true,
      },
    ];

    console.log('📦 Upscale task payload:', {
      taskType: 'imageUpscale',
      upscaleFactor,
      outputType: 'dataURI',
      outputFormat: 'PNG',
    });

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes timeout for upscaling
    });

    if (!response.data?.data?.[0]?.imageDataURI) {
      console.error('❌ Invalid upscale response:', response.data);
      throw new Error('Invalid upscale response from Runware API');
    }

    const imageDataURI = response.data.data[0].imageDataURI;
    const cost = response.data.data[0].cost || 0;

    console.log('✅ Image upscaled successfully!');
    console.log('💰 Cost:', cost);

    return imageDataURI;
  } catch (error: any) {
    console.error('❌ Upscale error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.code === 'ECONNABORTED') {
      throw new Error('Upscaling timed out. Please try again with a smaller image.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your Runware API key.');
    }
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.error || 'Invalid request';
      throw new Error(`Upscaling request invalid: ${errorMsg}. Image may be too large (max output: 4096x4096).`);
    }

    throw new Error(`Upscaling failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * SHARED: Supported resolutions for Seedance 1.0 Pro Fast (bytedance:2@2)
 */
export const SEEDANCE_SUPPORTED_RESOLUTIONS = [
  [864, 480],   // 16:9
  [736, 544],
  [640, 640],   // 1:1
  [544, 736],
  [480, 864],   // 9:16
  [416, 960],
  [960, 416],
  [1920, 1088],  // 16:9
  [1664, 1248],
  [1440, 1440],  // 1:1
  [1248, 1664],
  [1088, 1920],  // 9:16
  [928, 2176],
  [2176, 928],
];

/**
 * SHARED HELPER: Generate a video using Runware Seedance (bytedance:2@2) model
 * This function is used by both QuickClip and Promo Video Generator
 * 
 * @param imageURL - URL of the image to use as the video frame
 * @param duration - Video duration in seconds (1.2 to 12 in 0.1s increments)
 * @param animationPrompt - Animation effect description for video generation (required, 10-2500 characters)
 * @param width - Video width in pixels (must match supported resolution)
 * @param height - Video height in pixels (must match supported resolution)
 * @param customTaskUUID - Optional custom UUID for tracking (default: auto-generated)
 * @returns Object with taskUUID for polling
 */
export async function generateSeedanceVideo(
  imageURL: string,
  duration: number,
  animationPrompt: string,
  width: number,
  height: number,
  customTaskUUID?: string
): Promise<{ taskUUID: string }> {
  try {
    // Validation helper function
    const isValidResolution = (w: number, h: number): boolean => {
      return SEEDANCE_SUPPORTED_RESOLUTIONS.some(([supportedW, supportedH]) => supportedW === w && supportedH === h);
    };

    // Validate resolution before processing
    if (!isValidResolution(width, height)) {
      const supportedList = SEEDANCE_SUPPORTED_RESOLUTIONS.map(([w, h]) => `${w}×${h}`).join(', ');
      throw new Error(
        `Unsupported resolution ${width}×${height} for bytedance:2@2. Must use one of: ${supportedList}`
      );
    }

    // Validate duration (1.2s to 12s in 0.1s increments)
    if (duration < 1.2 || duration > 12) {
      throw new Error('Video duration must be between 1.2 and 12 seconds');
    }

    // Round to nearest 0.1s to ensure valid increment
    const roundedDuration = Math.round(duration * 10) / 10;

    // Validate animation prompt
    const trimmedPrompt = animationPrompt?.trim();
    if (!trimmedPrompt || trimmedPrompt.length < 10) {
      throw new Error('Animation prompt is required and must be at least 10 characters');
    }
    if (trimmedPrompt.length > 2500) {
      throw new Error('Animation prompt must be 2500 characters or less');
    }

    console.log('🎬 Starting Seedance video generation...');
    console.log('📸 Image URL:', imageURL);
    console.log('⏱️  Duration:', roundedDuration, 'seconds');
    console.log('📐 Dimensions:', `${width}×${height}`);
    console.log('🎭 Animation Prompt:', trimmedPrompt.substring(0, 100) + '...');

    const taskUUID = customTaskUUID || randomUUID();

    const payload = [
      {
        taskType: 'videoInference',
        taskUUID: taskUUID,
        model: 'bytedance:2@2', // Seedance 1.0 Pro Fast video model
        positivePrompt: trimmedPrompt, // Required by Runware API
        frameImages: [{ inputImage: imageURL }], // Correct format: array of objects with inputImage property
        duration: roundedDuration,
        width: width,
        height: height,
        outputFormat: 'mp4',
        deliveryMethod: 'async', // Async delivery for polling
        includeCost: true,
      },
    ];

    console.log('📦 Seedance video task payload:', {
      taskUUID,
      model: 'bytedance:2@2',
      duration: roundedDuration,
      dimensions: `${width}×${height}`,
    });

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 0, // No timeout limit
    });

    console.log('✅ Seedance video task submitted successfully');
    console.log('🆔 Task UUID:', taskUUID);

    return { taskUUID };
  } catch (error: any) {
    console.error('❌ Seedance video generation failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.code === 'ECONNABORTED') {
      throw new Error('Video generation request timed out. Please try again.');
    }
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your Runware API key.');
    }
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.error || 'Invalid request';
      throw new Error(`Video generation request invalid: ${errorMsg}`);
    }

    throw new Error(`Video generation failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Generate a QuickClip video using Runware Video Inference API
 * Wrapper around shared generateSeedanceVideo() function
 * 
 * @param imageURL - URL of the image to use as the video frame
 * @param duration - Video duration in seconds (1.2 to 12 in 0.1s increments)
 * @param animationPrompt - Animation effect description for video generation (required, 10-2500 characters)
 * @param width - Video width in pixels (must match supported resolution)
 * @param height - Video height in pixels (must match supported resolution)
 * @returns Object with taskUUID for polling
 */
export async function generateQuickClipVideo(
  imageURL: string,
  duration: number,
  animationPrompt: string,
  width: number,
  height: number
): Promise<{ taskUUID: string }> {
  console.log('🎬 [QuickClip] Delegating to shared Seedance generator...');
  return generateSeedanceVideo(imageURL, duration, animationPrompt, width, height);
}

/**
 * Poll for QuickClip video generation status
 * 
 * @param taskUUID - Task UUID from video generation request
 * @returns Video URL when ready, or status information
 */
export async function pollQuickClipVideoStatus(
  taskUUID: string
): Promise<{ status: 'processing' | 'success' | 'failed'; videoURL?: string; error?: string; cost?: number }> {
  try {
    console.log('🔄 [QuickClip Poll] Fetching status for task:', taskUUID);

    const payload = [
      {
        taskType: 'getResponse',
        taskUUID: taskUUID,
      },
    ];

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 0,
    });

    console.log('📦 [QuickClip Poll] Raw response:', JSON.stringify(response.data, null, 2));

    // Runware API returns: { data: [...], errors: [...] }
    const responseBody = response.data;
    
    // Check for errors first
    if (responseBody.errors && responseBody.errors.length > 0) {
      const error = responseBody.errors[0];
      console.error('❌ [QuickClip Poll] Runware error:', error.message);
      return { status: 'failed', error: error.message };
    }
    
    // Get the actual result from data array
    const result = responseBody.data?.[0];

    if (!result) {
      console.log('⚠️ [QuickClip Poll] No result in response.data');
      return { status: 'processing' };
    }

    // Debug: Log result structure
    console.log('🔍 [QuickClip Poll] Result keys:', Object.keys(result));
    console.log('🔍 [QuickClip Poll] Result status:', result.status);
    console.log('🔍 [QuickClip Poll] Full result:', JSON.stringify(result, null, 2));

    // Runware API structure: result = { taskUUID, status, videoURL, cost, ... }
    let videoURL: string | undefined;
    
    // 1. Check top-level direct URL fields
    videoURL = result.videoURL || result.video_url || result.outputURL || result.output || result.url;
    
    // 2. Check if the ENTIRE result object IS the URL (Runware sometimes does this)
    if (!videoURL && typeof result === 'string' && result.startsWith('http')) {
      videoURL = result;
      console.log('✨ [QuickClip Poll] Result itself is the URL');
    }
    
    // 3. Check nested outputs array (common for video tasks)
    if (!videoURL && result.outputs && Array.isArray(result.outputs) && result.outputs.length > 0) {
      const firstOutput = result.outputs[0];
      // Check all possible fields in outputs
      videoURL = firstOutput.videoURL || 
                firstOutput.video_url || 
                firstOutput.url || 
                firstOutput.outputURL ||
                firstOutput.output ||
                firstOutput.assets?.[0] ||
                (typeof firstOutput === 'string' && firstOutput.startsWith('http') ? firstOutput : undefined);
      if (videoURL) console.log('✨ [QuickClip Poll] Found video in outputs array');
    }
    
    // 4. Check media array
    if (!videoURL && result.media && Array.isArray(result.media) && result.media.length > 0) {
      const firstMedia = result.media[0];
      videoURL = firstMedia.url || firstMedia.videoURL || firstMedia.video_url ||
                (typeof firstMedia === 'string' && firstMedia.startsWith('http') ? firstMedia : undefined);
      if (videoURL) console.log('✨ [QuickClip Poll] Found video in media array');
    }
    
    // 5. Check assets array (can be array of strings or objects)
    if (!videoURL && result.assets && Array.isArray(result.assets) && result.assets.length > 0) {
      const firstAsset = result.assets[0];
      videoURL = typeof firstAsset === 'string' ? firstAsset : (firstAsset?.url || firstAsset?.videoURL);
      if (videoURL) console.log('✨ [QuickClip Poll] Found video in assets array');
    }
    
    // 6. Check data field (sometimes Runware nests it here)
    if (!videoURL && result.data) {
      if (typeof result.data === 'string' && result.data.startsWith('http')) {
        videoURL = result.data;
        console.log('✨ [QuickClip Poll] Found video in data field');
      } else if (Array.isArray(result.data) && result.data.length > 0) {
        const firstData = result.data[0];
        videoURL = typeof firstData === 'string' ? firstData : (firstData?.url || firstData?.videoURL);
        if (videoURL) console.log('✨ [QuickClip Poll] Found video in data array');
      }
    }
    
    console.log(`🔍 [QuickClip Poll] Video URL extraction result: ${videoURL ? videoURL.substring(0, 80) + '...' : 'NOT FOUND'}`);
    
    // CRITICAL FIX: If we have a valid videoURL, the video IS ready regardless of status field
    // Runware sometimes returns the video without setting status='success'
    if (videoURL && typeof videoURL === 'string' && videoURL.startsWith('http')) {
      const cost = result.cost || 0;
      
      console.log('✅ [QuickClip Poll] SUCCESS! Video ready!');
      console.log('🎬 [QuickClip Poll] Video URL:', videoURL);
      console.log('💰 [QuickClip Poll] Cost:', cost);
      console.log('📊 [QuickClip Poll] Result status field was:', result.status || '(undefined)');

      // Always return camelCase videoURL for frontend consistency
      return { status: 'success', videoURL, cost };
    }

    // Check for errors
    const errorMessage = result.error || result.errorMessage;
    if (errorMessage) {
      console.error('❌ [QuickClip Poll] Failed:', errorMessage);
      return { status: 'failed', error: errorMessage };
    }

    // Still processing
    console.log('⏳ [QuickClip Poll] Still processing...');
    return { status: 'processing' };
  } catch (error: any) {
    console.error('❌ [QuickClip Poll] Request error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return { status: 'processing' };
  }
}

/**
 * Map project size to width/height dimensions
 */
export function mapSizeToRunwareDimensions(size: string): { width: number; height: number } {
  switch (size) {
    case '12x12': // 1:1
      return { width: 1024, height: 1024 };
    case '9x12': // 3:4
      return { width: 768, height: 1024 };
    case '16x9': // 16:9
      return { width: 1024, height: 576 };
    case '9x16': // 9:16
      return { width: 576, height: 1024 };
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Automatically detect music mood from animation prompt
 */
export function detectMusicMoodFromPrompt(animationPrompt: string): string {
  const prompt = animationPrompt.toLowerCase();
  
  // Energetic/upbeat keywords
  if (prompt.match(/\b(jump|bounce|dance|party|celebration|energetic|exciting|dynamic|vibrant|fast|quick|rush|speed|zoom)\b/i)) {
    return 'cinematic energetic';
  }
  
  // Modern/tech keywords
  if (prompt.match(/\b(modern|tech|digital|cyber|futuristic|innovation|sleek|minimal|contemporary)\b/i)) {
    return 'modern ambient';
  }
  
  // Corporate/professional keywords
  if (prompt.match(/\b(business|corporate|professional|meeting|office|presentation|formal)\b/i)) {
    return 'inspiring corporate';
  }
  
  // Soft/gentle keywords
  if (prompt.match(/\b(soft|gentle|peaceful|calm|serene|relax|quiet|smooth|flowing|drift)\b/i)) {
    return 'soft ambient';
  }
  
  // Dramatic/cinematic keywords
  if (prompt.match(/\b(dramatic|epic|cinematic|powerful|intense|grand|majestic|hero)\b/i)) {
    return 'cinematic dramatic';
  }
  
  // Default to calm/neutral
  return 'calm ambient';
}

/**
 * Generate background music using Runware audioInference API
 */
export async function generateBackgroundMusic(
  musicPrompt: string,
  duration: number,
  customTaskUUID?: string
): Promise<{ taskUUID: string; audioURL?: string }> {
  try {
    console.log('🎵 Starting music generation...');
    console.log('🎼 Music prompt:', musicPrompt);
    console.log('⏱️  Duration:', duration, 'seconds');

    const taskUUID = customTaskUUID || randomUUID();

    const payload = [
      {
        taskType: 'audioInference',
        taskUUID: taskUUID,
        positivePrompt: musicPrompt,
        duration: duration,
        outputFormat: 'mp3',
        model: 'elevenlabs:1@1',
        includeCost: true,
      },
    ];

    console.log('📦 Music generation payload:', {
      taskUUID,
      model: 'elevenlabs:1@1',
      duration,
      prompt: musicPrompt.substring(0, 100),
    });

    const response = await axios.post(RUNWARE_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    console.log('✅ Music generation request submitted');
    console.log('📦 Response status:', response.status);
    
    const responseData = Array.isArray(response.data) ? response.data[0] : response.data;
    const audioURL = responseData?.audioURL || responseData?.audio_url || responseData?.url;
    
    if (audioURL) {
      console.log('🎶 Audio immediately available:', audioURL);
      return { taskUUID, audioURL };
    }

    return { taskUUID };
  } catch (error: any) {
    console.error('❌ Music generation failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('API authentication failed. Please check your Runware API key.');
    }
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.error || 'Invalid request';
      throw new Error(`Music generation request invalid: ${errorMsg}`);
    }

    throw new Error(`Music generation failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Poll for music generation status
 */
export async function pollMusicGenerationStatus(taskUUID: string): Promise<{
  status: 'success' | 'processing' | 'failed';
  audioURL?: string;
  error?: string;
  cost?: number;
}> {
  try {
    console.log(`🎵 [Music Poll] Polling music status for UUID: ${taskUUID}`);

    const response = await axios.get(`${RUNWARE_API_URL}?taskUUID=${taskUUID}`, {
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
      },
      timeout: 30000,
    });

    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log('📦 [Music Poll] Response:', JSON.stringify(result, null, 2));

    let audioURL = result?.audioURL || result?.audio_url || result?.url || result?.outputURL;
    
    if (!audioURL && result?.data) {
      if (typeof result.data === 'string' && result.data.startsWith('http')) {
        audioURL = result.data;
      } else if (Array.isArray(result.data) && result.data.length > 0) {
        const firstData = result.data[0];
        audioURL = typeof firstData === 'string' ? firstData : (firstData?.url || firstData?.audioURL);
      }
    }

    if (audioURL && typeof audioURL === 'string' && audioURL.startsWith('http')) {
      const cost = result.cost || 0;
      console.log('✅ [Music Poll] SUCCESS! Music ready:', audioURL);
      return { status: 'success', audioURL, cost };
    }

    const errorMessage = result.error || result.errorMessage;
    if (errorMessage) {
      console.error('❌ [Music Poll] Failed:', errorMessage);
      return { status: 'failed', error: errorMessage };
    }

    console.log('⏳ [Music Poll] Still processing...');
    return { status: 'processing' };
  } catch (error: any) {
    console.error('❌ [Music Poll] Request error:', error.message);
    return { status: 'processing' };
  }
}