// Google Gemini AI integration - based on javascript_gemini blueprint
import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import axios from "axios";
import { enforceGeminiEthnicConsistency, getEthnicConsistencySystemInstruction } from "./promptUtils";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateAdCopy(params: {
  platform: string;
  productName: string;
  productDescription: string;
  targetAudience?: string;
  tone?: string;
}): Promise<string> {
  const { platform, productName, productDescription, targetAudience, tone } = params;

  const prompt = `Create compelling ad copy for ${platform} with the following details:

Product Name: ${productName}
Product Description: ${productDescription}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
Tone: ${tone || 'professional'}

Generate engaging ad copy that:
1. Captures attention with a strong hook
2. Highlights key benefits
3. Includes a clear call-to-action
4. Matches the ${tone || 'professional'} tone
5. Is optimized for ${platform}

Keep it concise and persuasive.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    return response.text || "Failed to generate ad copy";
  } catch (error) {
    console.error("Error generating ad copy:", error);
    throw new Error(`Failed to generate ad copy: ${error}`);
  }
}

export async function generateBrandKit(params: {
  brandName: string;
  industry: string;
  description: string;
}): Promise<{
  summary: string;
  tagline: string;
  colors: string[];
  tone: string;
}> {
  const { brandName, industry, description } = params;

  const systemPrompt = `You are a brand strategy expert. Create a comprehensive BrandKit based on the provided information. Return JSON with: summary (150 words), tagline (10 words max), colors (array of 5 hex colors), and tone (one word: professional/friendly/bold/innovative).`;

  const prompt = `Brand Name: ${brandName}
Industry: ${industry}
Description: ${description}

Create a BrandKit with brand summary, tagline, color palette, and brand tone.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            tagline: { type: "string" },
            colors: { type: "array", items: { type: "string" } },
            tone: { type: "string" },
          },
          required: ["summary", "tagline", "colors", "tone"],
        },
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const rawJson = response.text;

    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("No response text from Gemini");
    }
  } catch (error) {
    console.error("Error generating BrandKit:", error);
    throw new Error(`Failed to generate BrandKit: ${error}`);
  }
}

export async function generateVisualImage(
  prompt: string,
  outputPath: string,
): Promise<string> {
  try {
    // Enforce Southeast Asian ethnic consistency for all visual generation
    const enhancedPrompt = enforceGeminiEthnicConsistency(prompt);
    const ethnicSystemInstruction = getEthnicConsistencySystemInstruction();
    
    // IMPORTANT: only this gemini model supports image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        systemInstruction: ethnicSystemInstruction,
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image generated");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No content in response");
    }

    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const imageData = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(outputPath, imageData);
        console.log(`Image saved as ${outputPath}`);
        return outputPath;
      }
    }

    throw new Error("No image data in response");
  } catch (error) {
    throw new Error(`Failed to generate image: ${error}`);
  }
}

/**
 * Generate fusion visual using Vertex AI Imagen API with uploaded background scene
 * Analyzes both background and product images, then generates natural fusion with Imagen
 */
export async function generateFusionVisualWithUploadedBackground(
  backgroundImagePath: string,
  productImagePath: string,
  placementDescription: string,
): Promise<string> {
  let uploadedBackgroundFile: any = null;
  let uploadedProductFile: any = null;
  
  try {
    console.log('🎨 Step 1: Uploading images to Gemini for analysis...');
    
    // Upload background image
    const backgroundBuffer = fs.readFileSync(backgroundImagePath);
    const backgroundMimeType = backgroundImagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const backgroundBlob = new Blob([backgroundBuffer], { type: backgroundMimeType });
    
    uploadedBackgroundFile = await ai.files.upload({
      file: backgroundBlob,
      config: {
        displayName: `Background-${Date.now()}`,
        mimeType: backgroundMimeType,
      }
    });
    
    console.log(`✅ Background uploaded: ${uploadedBackgroundFile.uri}`);
    
    // Upload product image
    const productBuffer = fs.readFileSync(productImagePath);
    const productMimeType = productImagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const productBlob = new Blob([productBuffer], { type: productMimeType });
    
    uploadedProductFile = await ai.files.upload({
      file: productBlob,
      config: {
        displayName: `Product-${Date.now()}`,
        mimeType: productMimeType,
      }
    });
    
    console.log(`✅ Product uploaded: ${uploadedProductFile.uri}`);
    
    // Wait for both files to process
    for (const file of [uploadedBackgroundFile, uploadedProductFile]) {
      let fileState = file.state;
      let attempts = 0;
      while (fileState === 'PROCESSING' && attempts < 30) {
        console.log('⏳ Waiting for file processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const fileInfo = await ai.files.get({ name: file.name || '' });
        fileState = fileInfo.state;
        attempts++;
      }
      
      if (fileState === 'FAILED') {
        throw new Error('File processing failed');
      }
    }
    
    console.log('✅ All files processed');

    // Step 2: Analyze both images with Gemini
    console.log('🎨 Step 2: Analyzing background scene and product with Gemini...');
    
    const analysisPrompt = enforceGeminiEthnicConsistency(`Analyze these two images to create a natural product fusion:

IMAGE 1 (Background Scene): Describe the setting, environment, lighting, atmosphere, and any key elements.

IMAGE 2 (Product): Describe the product type, colors, materials, size, and distinctive features.

Provide a detailed description (3-4 sentences) for generating a photorealistic fusion where the product is naturally integrated into the background scene. The product should look like it belongs in this environment with realistic lighting, shadows, and placement.`);

    const analysisResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: uploadedBackgroundFile.uri,
                mimeType: uploadedBackgroundFile.mimeType || 'image/jpeg',
              }
            },
            {
              fileData: {
                fileUri: uploadedProductFile.uri,
                mimeType: uploadedProductFile.mimeType || 'image/jpeg',
              }
            },
            { text: analysisPrompt }
          ],
        },
      ],
    });

    const fusionDescription = analysisResponse.text?.trim() || "product in scene";
    console.log(`✅ Fusion analysis: ${fusionDescription.substring(0, 150)}...`);

    // Read background image dimensions to preserve exact aspect ratio
    const backgroundMetadata = await sharp(backgroundImagePath).metadata();
    const bgWidth = backgroundMetadata.width || 1024;
    const bgHeight = backgroundMetadata.height || 1024;
    const bgAspectRatio = bgWidth / bgHeight;
    
    // Map to closest Imagen supported aspect ratio
    let imagenAspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    if (Math.abs(bgAspectRatio - 1.0) < 0.15) {
      imagenAspectRatio = "1:1";
    } else if (Math.abs(bgAspectRatio - (3/4)) < 0.15) {
      imagenAspectRatio = "3:4";
    } else if (Math.abs(bgAspectRatio - (4/3)) < 0.15) {
      imagenAspectRatio = "4:3";
    } else if (Math.abs(bgAspectRatio - (9/16)) < 0.15) {
      imagenAspectRatio = "9:16";
    } else if (Math.abs(bgAspectRatio - (16/9)) < 0.15) {
      imagenAspectRatio = "16:9";
    } else if (bgAspectRatio > 1) {
      imagenAspectRatio = "16:9"; // Landscape default
    } else {
      imagenAspectRatio = "9:16"; // Portrait default
    }
    
    console.log(`📐 Background dimensions: ${bgWidth}x${bgHeight} (${bgAspectRatio.toFixed(2)}), using Imagen aspect ratio: ${imagenAspectRatio}`);

    // Step 3: Generate natural fusion with Vertex AI Imagen
    console.log('🎨 Step 3: Generating photorealistic fusion with Vertex AI Imagen...');
    
    const fusionPrompt = enforceGeminiEthnicConsistency(`${fusionDescription}

${placementDescription ? `PLACEMENT: ${placementDescription}` : ''}

CRITICAL REQUIREMENTS - DO NOT MODIFY:
1. PRESERVE BACKGROUND SCENE EXACTLY: Use the original background scene as provided - do NOT crop, resize, or alter its dimensions, composition, or aspect ratio in any way
2. PRESERVE PRODUCT APPEARANCE EXACTLY: The product must maintain its original shape, color, texture, labeling, and proportions from the uploaded product image - do NOT alter the product's visual appearance
3. ONLY ADJUST LIGHTING AND SHADOWS: Apply environmental lighting and shadows to the product to match the background scene naturally - this is the ONLY modification allowed
4. Natural integration: The product should blend naturally into the background with realistic lighting, shadows, and reflections that match the scene's environment
5. Professional photography quality: Sharp focus, high detail, photorealistic rendering
6. Clean composition: No distortion, blurriness, watermarks, or text overlays

This prompt overrides any default cropping, aspect-ratio enforcement, or model-generated alterations to the product or background. The final image must preserve the exact dimensions and appearance of the uploaded background scene while seamlessly integrating the product with appropriate environmental lighting only.`);

    // Generate fusion image with Vertex AI Imagen using original background aspect ratio
    const imageResponse = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: fusionPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: imagenAspectRatio,
      }
    });

    console.log('✅ Fusion visual generated by Imagen');

    // Extract and save the generated image
    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
      throw new Error("No images generated by Imagen");
    }

    const generatedImage = imageResponse.generatedImages[0];
    
    if (!generatedImage.image || !generatedImage.image.imageBytes) {
      throw new Error("No image data in Imagen response");
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(generatedImage.image.imageBytes, 'base64');
    
    // CRITICAL: Resize generated image to EXACT original background dimensions
    // Using 'cover' to intelligently crop/zoom while preserving scene composition
    console.log(`🔄 Post-processing: Resizing fusion to exact background dimensions (${bgWidth}x${bgHeight})...`);
    console.log(`ℹ️  Note: Imagen generated at ${imagenAspectRatio} ratio, resizing to exact dimensions may crop slightly`);
    
    const resizedBuffer = await sharp(buffer)
      .resize(bgWidth, bgHeight, {
        fit: 'cover', // Smart crop to exact dimensions while preserving composition
        position: 'center', // Center the crop
      })
      .png()
      .toBuffer();
    
    // Save the resized fusion image
    const fusionImageFilename = `imagen-fusion-${Date.now()}-${randomUUID()}.png`;
    const fusionImagePath = path.join(process.cwd(), 'uploads', fusionImageFilename);
    fs.writeFileSync(fusionImagePath, resizedBuffer);
    
    const fusionImageUrl = `/uploads/${fusionImageFilename}`;
    console.log(`✅ Natural fusion saved at EXACT original dimensions (${bgWidth}x${bgHeight}): ${fusionImageUrl}`);

    return fusionImageUrl;
  } catch (error: any) {
    console.error("Error in generateFusionVisualWithUploadedBackground:", error);
    throw new Error(`Failed to generate fusion with Imagen: ${error.message || error}`);
  } finally {
    // Cleanup temporary files
    for (const filePath of [backgroundImagePath, productImagePath]) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Cleaned up: ${filePath}`);
        }
      } catch (cleanupError) {
        console.log('⚠️ Cleanup skipped:', cleanupError);
      }
    }

    // Clean up uploaded files from Gemini
    for (const file of [uploadedBackgroundFile, uploadedProductFile]) {
      if (file) {
        try {
          await ai.files.delete({ name: file.name || '' });
          console.log('✅ Gemini file cleaned up');
        } catch (cleanupError) {
          console.log('⚠️ Gemini file cleanup skipped:', cleanupError);
        }
      }
    }
  }
}

/**
 * Generate fusion visual using Vertex AI Imagen API
 * Analyzes product image with Gemini, then generates fusion visual with Imagen
 */
export async function generateFusionVisualWithFilesAPI(
  productImagePath: string,
  backgroundPrompt: string,
  placementDescription: string,
): Promise<string> {
  let uploadedFile: any = null;
  
  try {
    console.log('🎨 Step 1: Uploading product image to analyze with Gemini...');
    
    // Read the product image file and detect MIME type
    const productImageBuffer = fs.readFileSync(productImagePath);
    const mimeType = productImagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const productImageBlob = new Blob([productImageBuffer], { type: mimeType });
    
    // Upload the product image to Gemini Files API for analysis
    uploadedFile = await ai.files.upload({
      file: productImageBlob,
      config: {
        displayName: `Product-${Date.now()}`,
        mimeType: mimeType,
      }
    });

    console.log(`✅ File uploaded: ${uploadedFile.name}, URI: ${uploadedFile.uri}`);

    // Wait for file processing if needed
    let fileState = uploadedFile.state;
    let attempts = 0;
    while (fileState === 'PROCESSING' && attempts < 30) {
      console.log('⏳ Waiting for file processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const fileInfo = await ai.files.get({ name: uploadedFile.name || '' });
      fileState = fileInfo.state;
      attempts++;
    }

    if (fileState === 'FAILED') {
      throw new Error('File processing failed');
    }

    console.log('✅ File processing complete');

    // Step 2: Use Gemini to analyze the product and create detailed prompt
    console.log('🎨 Step 2: Analyzing product with Gemini...');
    
    const analysisPrompt = enforceGeminiEthnicConsistency(`Analyze this product image in detail. Describe:
1. What the product is (type, category, main features)
2. Its colors, materials, and visual characteristics
3. Its approximate size/scale
4. Any distinctive features or design elements

Provide a concise, factual description (2-3 sentences) that would help an AI generate a realistic product fusion image.`);

    const analysisResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: uploadedFile.mimeType || 'image/jpeg',
              }
            },
            { text: analysisPrompt }
          ],
        },
      ],
    });

    const productDescription = analysisResponse.text?.trim() || "product";
    console.log(`✅ Product analyzed: ${productDescription.substring(0, 100)}...`);

    // Step 3: Generate fusion visual with Vertex AI Imagen
    console.log('🎨 Step 3: Generating fusion visual with Vertex AI Imagen...');
    
    // Create structured fusion prompt with clear sections emphasizing product preservation (with ethnic consistency)
    const fusionPrompt = enforceGeminiEthnicConsistency(`PRODUCT (PRESERVE EXACTLY): ${productDescription}
The product MUST maintain its EXACT original appearance, size, shape, proportions, colors, and details from the reference image. Do not alter, distort, resize, or modify the product in any way.

SCENE: ${backgroundPrompt}

COMPOSITION: ${placementDescription || `Product centered naturally in the scene`}

REQUIREMENTS:
- Product retains its EXACT original dimensions, shape, and proportions
- Product maintains EXACT original colors, textures, and surface details
- Product preserves all branding, labels, and text exactly as in the reference
- Natural photorealistic integration with the background scene
- Professional studio-quality lighting that complements but does not alter the product
- Sharp focus, high detail, 4K resolution
- Product as the hero focal point with clean composition

AVOID: Any product distortion, resizing, color changes, shape modifications, blurry product, low quality, watermarks, text overlays, unrealistic lighting on product, poor composition`);

    // Generate image with Vertex AI Imagen
    const imageResponse = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: fusionPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
      }
    });

    console.log('✅ Fusion visual generated by Imagen');

    // Extract and save the generated image
    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
      throw new Error("No images generated by Imagen");
    }

    const generatedImage = imageResponse.generatedImages[0];
    
    if (!generatedImage.image) {
      throw new Error("No image data in Imagen response");
    }
    
    // Get base64-encoded image bytes from the image object
    const imgBytes = generatedImage.image.imageBytes;
    
    if (!imgBytes) {
      throw new Error("No imageBytes in Imagen response");
    }
    
    // Convert base64 to buffer and save
    const fusionImageFilename = `imagen-fusion-${Date.now()}-${randomUUID()}.png`;
    const fusionImagePath = path.join(process.cwd(), 'uploads', fusionImageFilename);
    const buffer = Buffer.from(imgBytes, 'base64');
    fs.writeFileSync(fusionImagePath, buffer);
    
    const fusionImageUrl = `/uploads/${fusionImageFilename}`;
    console.log(`✅ Fusion visual saved: ${fusionImageUrl}`);

    return fusionImageUrl;
  } catch (error: any) {
    console.error("Error in generateFusionVisualWithFilesAPI:", error);
    throw new Error(`Failed to generate fusion visual with Vertex AI Imagen: ${error.message || error}`);
  } finally {
    // Guaranteed cleanup of temporary files regardless of success/failure
    try {
      if (fs.existsSync(productImagePath)) {
        fs.unlinkSync(productImagePath);
        console.log('✅ Temporary product image cleaned up from server');
      }
    } catch (cleanupError) {
      console.log('⚠️ Product image cleanup skipped:', cleanupError);
    }

    // Clean up uploaded file from Gemini
    if (uploadedFile) {
      try {
        await ai.files.delete({ name: uploadedFile.name || '' });
        console.log('✅ Uploaded file cleaned up from Gemini');
      } catch (cleanupError) {
        console.log('⚠️ Gemini file cleanup skipped:', cleanupError);
      }
    }
  }
}

export async function optimizePrompt(userPrompt: string): Promise<string> {
  const ethnicConsistency = getEthnicConsistencySystemInstruction();
  const systemPrompt = `You are an expert prompt engineer specializing in image generation. Your task is to transform user keywords into detailed, optimized prompts that produce high-quality images.

Key Guidelines:
- Add specific visual details (lighting, composition, style, mood)
- Include technical photography terms when relevant
- Keep the optimized prompt clear and focused
- Maintain the original intent while enhancing specificity
- Output only the optimized prompt, no explanations

${ethnicConsistency}`;

  const enhancedUserPrompt = enforceGeminiEthnicConsistency(userPrompt);
  const prompt = `Transform this keyword into an optimized image generation prompt:

User Input: "${enhancedUserPrompt}"

Optimized Prompt:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const optimized = response.text?.trim();
    return optimized && optimized.length > 0 ? optimized : userPrompt;
  } catch (error) {
    console.error("Error optimizing prompt, returning original:", error);
    // Gracefully fall back to original prompt on error
    return userPrompt;
  }
}

/**
 * Generate animation prompt from an image for video generation
 * Uses Gemini Vision API to analyze the image and suggest animation effects
 * 
 * @param imageSource - Either a URL (https://...) or a local file path
 * @param variation - Optional variation seed for diverse prompt generation
 * @returns Animation prompt describing motion/camera effects
 */
export async function generateAnimationPromptFromImage(
  imageSource: string,
  variation: number = 0
): Promise<string> {
  try {
    console.log('🎬 Generating animation prompt from image...');
    console.log('📸 Image source:', imageSource);
    console.log('🎲 Variation seed:', variation);

    // Security: Only accept HTTPS URLs, reject file paths and HTTP
    if (!imageSource.startsWith('https://')) {
      throw new Error('Only HTTPS URLs are accepted. File paths and HTTP URLs are not allowed for security reasons.');
    }

    // Security: Strict domain whitelist (Replit object storage + test domains)
    const allowedDomains = [
      'objects.replcdn.com',    // Replit object storage
      'replit.app',             // Replit deployments
      'replit.dev',             // Replit development
      'h5.arriival.com',        // Test domain
      'manus-asia.computer',    // Manus sandbox domain
    ];
    
    let urlObj: URL;
    try {
      urlObj = new URL(imageSource);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowedDomain) {
      throw new Error(`Domain ${urlObj.hostname} is not whitelisted. Only Replit object storage and authorized domains are allowed.`);
    }

    // Fetch image with security limits
    const response = await axios.get(imageSource, { 
      responseType: 'arraybuffer',
      timeout: 10000, // 10 second timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB max size
      maxBodyLength: 10 * 1024 * 1024,
      validateStatus: (status) => status === 200, // Only accept 200 OK
    });

    // Additional size check
    if (response.data.length > 10 * 1024 * 1024) {
      throw new Error('Image size exceeds 10MB limit');
    }

    const imageData = Buffer.from(response.data).toString('base64');
    
    // Determine mime type from response headers
    let mimeType: string = "image/jpeg";
    const contentType = response.headers['content-type'];
    if (contentType && contentType.startsWith('image/')) {
      mimeType = contentType;
    } else if (imageSource.match(/\.(png|webp|jpg|jpeg)$/i)) {
      const ext = imageSource.match(/\.(png|webp|jpg|jpeg)$/i)?.[1].toLowerCase();
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
    }

    // Create variation prompts for diversity (IMPORTANT: Keep responses concise - max 150 characters)
    const variationPrompts = [
      enforceGeminiEthnicConsistency(`Generate a SHORT video prompt (MAX 150 chars): Describe a smooth ZOOM IN camera movement with dramatic lighting change.`),
      
      enforceGeminiEthnicConsistency(`Generate a SHORT video prompt (MAX 150 chars): Describe a gentle PAN LEFT or PAN RIGHT with soft color grading shift.`),
      
      enforceGeminiEthnicConsistency(`Generate a SHORT video prompt (MAX 150 chars): Describe a PULL BACK camera move revealing scene with depth and atmosphere change.`),
      
      enforceGeminiEthnicConsistency(`Generate a SHORT video prompt (MAX 150 chars): Describe a TILT UP or TILT DOWN movement with highlight and shadow transition.`),
      
      enforceGeminiEthnicConsistency(`Generate a SHORT video prompt (MAX 150 chars): Describe an ORBIT/ROTATE camera movement with ambient lighting evolution.`),
    ];

    const selectedPrompt = variationPrompts[variation % variationPrompts.length];

    const contents = [
      {
        inlineData: {
          mimeType,
          data: imageData,
        },
      },
      {
        text: selectedPrompt,
      },
    ];

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    const animationPrompt = geminiResponse.text?.trim() || "";
    
    console.log('✅ Generated animation prompt:', animationPrompt.substring(0, 100) + '...');
    
    return animationPrompt;
  } catch (error) {
    console.error("❌ Error generating animation prompt:", error);
    throw new Error(`Failed to generate animation prompt: ${error}`);
  }
}

export async function generateText(
  prompt: string,
  modelPreference: 'gemini-flash' | 'gemini-pro' = 'gemini-flash'
): Promise<string> {
  try {
    const model = modelPreference === 'gemini-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    // Apply ethnic consistency to all text generation that might influence visual outputs
    const enhancedPrompt = enforceGeminiEthnicConsistency(prompt);
    const ethnicSystemInstruction = getEthnicConsistencySystemInstruction();
    
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction: ethnicSystemInstruction,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: enhancedPrompt }],
        },
      ],
    });

    const rawText = response.text?.trim() || "";
    
    // Strip markdown code blocks if present (e.g., ```json ... ```)
    const cleanedText = rawText.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();
    
    return cleanedText;
  } catch (error) {
    console.error("Error generating text:", error);
    throw new Error(`Failed to generate text: ${error}`);
  }
}
