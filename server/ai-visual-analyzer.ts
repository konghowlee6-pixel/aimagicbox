import { GoogleGenAI } from "@google/genai";
import { getEthnicConsistencySystemInstruction } from "./promptUtils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface VisualAnalysisResult {
  detectedFaces: Array<{ x: number; y: number; width: number; height: number }>;
  detectedObjects: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  brightnessZones: Array<{ region: string; brightness: number; variance: number }>;
  recommendedTextRegion: string;
  recommendedTextColor: 'light' | 'dark';
  useBackgroundOverlay: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  analyzed: boolean;
}

export async function analyzeVisualForTextPlacement(base64Image: string): Promise<VisualAnalysisResult> {
  try {
    const systemPrompt = `You are an expert visual analyst specializing in image composition and text placement for marketing materials.

Analyze the provided image and determine:
1. **Detected Faces**: Identify ALL human faces and their bounding boxes (normalized 0-1 coordinates). Be thorough - even partial faces matter.
2. **Detected Objects**: Identify ALL important objects/subjects and their bounding boxes (normalized 0-1 coordinates). Include people, products, focal points.
3. **Brightness Zones**: Analyze brightness/darkness in 9 regions (top-left, top-center, top-right, middle-left, middle-center, middle-right, bottom-left, bottom-center, bottom-right)
4. **Recommended Text Region**: Best region for text placement that COMPLETELY avoids faces/objects. Prioritize regions with NO detected faces or important objects.
5. **Recommended Text Color**: 'light' (white/bright) or 'dark' (black/dark gray) based on background brightness
6. **Background Overlay**: Whether a semi-transparent background overlay is needed behind text for better contrast and readability

Return your analysis in the following JSON format:
{
  "detectedFaces": [{"x": 0.2, "y": 0.3, "width": 0.15, "height": 0.2}],
  "detectedObjects": [{"x": 0.5, "y": 0.4, "width": 0.3, "height": 0.4, "label": "product"}],
  "brightnessZones": [
    {"region": "top-left", "brightness": 180, "variance": 1200},
    {"region": "top-center", "brightness": 200, "variance": 800}
  ],
  "recommendedTextRegion": "top-right",
  "recommendedTextColor": "light",
  "useBackgroundOverlay": true,
  "overlayColor": "rgba(0,0,0,0.5)",
  "overlayOpacity": 0.7
}

CRITICAL Guidelines for Text Region Selection:
- **TOP PRIORITY**: Choose a region with ZERO overlap with faces or important objects
- Calculate overlap percentage for each region - ONLY recommend regions with 0% overlap
- If multiple regions have no overlap, choose the one with lowest brightness variance (most uniform)
- NEVER recommend a region that covers even part of a face or key object
- Recommended region must have at least 70% empty space for text

Guidelines for Background Overlay:
- Set "useBackgroundOverlay": true when:
  * Brightness variance in recommended region is > 3000 (indicates busy/textured background)
  * OR recommended text color would have poor contrast (brightness 100-155 is problematic)
  * OR there are complex patterns in the text region
- "overlayColor" should be:
  * "rgba(0,0,0,0.6)" (dark overlay) when recommendedTextColor is "light"
  * "rgba(255,255,255,0.7)" (light overlay) when recommendedTextColor is "dark"
- "overlayOpacity" should be 0.6-0.8 (higher for busier backgrounds)

Technical Details:
- Coordinates are normalized 0-1 (0 = left/top edge, 1 = right/bottom edge)
- Brightness is 0-255 (0 = black, 255 = white)
- Variance indicates uniformity (lower = more uniform, better for text)
- Text must be highly readable - when in doubt, recommend background overlay`;

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = base64Image.match(/data:image\/(\w+);base64/)?.[1] || 'png';

    const contents = [
      {
        inlineData: {
          data: imageData,
          mimeType: `image/${mimeType}`,
        },
      },
      "Analyze this image and provide detailed visual analysis for optimal text placement.",
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: contents,
    });

    console.log("Visual Analysis Raw Response:", response);
    
    const rawJson = response.text;
    console.log("Visual Analysis Result Text:", rawJson);
    console.log("Response text type:", typeof rawJson);

    if (!rawJson) {
      console.error("No text in response. Response keys:", Object.keys(response));
      throw new Error("Empty response text from Gemini");
    }

    const analysisData = JSON.parse(rawJson);
    console.log("Parsed Analysis Data:", analysisData);
    
    // Validate and sanitize overlay opacity (must be 0-1)
    let overlayOpacity = analysisData.overlayOpacity;
    if (typeof overlayOpacity === 'number') {
      overlayOpacity = Math.max(0, Math.min(1, overlayOpacity));
    }
    
    // Validate overlay color format (must be rgba or valid CSS color)
    let overlayColor = analysisData.overlayColor;
    if (overlayColor && typeof overlayColor === 'string') {
      // Simple validation - check if it's rgba format or hex
      const isValidColor = /^(rgba?\([^)]+\)|#[0-9A-Fa-f]{6})/.test(overlayColor);
      if (!isValidColor) {
        console.warn("Invalid overlay color from AI, using default:", overlayColor);
        overlayColor = undefined;
      }
    }
    
    return {
      detectedFaces: analysisData.detectedFaces || [],
      detectedObjects: analysisData.detectedObjects || [],
      brightnessZones: analysisData.brightnessZones || [],
      recommendedTextRegion: analysisData.recommendedTextRegion || "top-left",
      recommendedTextColor: analysisData.recommendedTextColor || "light",
      useBackgroundOverlay: analysisData.useBackgroundOverlay || false,
      overlayColor,
      overlayOpacity,
      analyzed: true,
    };
  } catch (error) {
    console.error("Failed to analyze visual:", error);
    // Return safe fallback
    return {
      detectedFaces: [],
      detectedObjects: [],
      brightnessZones: [],
      recommendedTextRegion: "top-left",
      recommendedTextColor: "light",
      useBackgroundOverlay: false,
      analyzed: false,
    };
  }
}

export function calculateOptimalTextPosition(
  analysis: VisualAnalysisResult,
  imageWidth: number,
  imageHeight: number
): { region: string; textColor: 'light' | 'dark'; avoidsFaces: boolean; avoidsObjects: boolean } {
  const { detectedFaces, detectedObjects, recommendedTextRegion, recommendedTextColor } = analysis;

  // Check if recommended region intersects with faces or objects
  const regionCoords = getRegionCoordinates(recommendedTextRegion);
  
  const avoidsFaces = !detectedFaces.some(face => 
    boxesIntersect(regionCoords, face)
  );
  
  const avoidsObjects = !detectedObjects.some(obj => 
    boxesIntersect(regionCoords, obj)
  );

  return {
    region: recommendedTextRegion,
    textColor: recommendedTextColor,
    avoidsFaces,
    avoidsObjects,
  };
}

function getRegionCoordinates(region: string): { x: number; y: number; width: number; height: number } {
  const regionMap: Record<string, { x: number; y: number; width: number; height: number }> = {
    'top-left': { x: 0, y: 0, width: 0.33, height: 0.33 },
    'top-center': { x: 0.33, y: 0, width: 0.34, height: 0.33 },
    'top-right': { x: 0.67, y: 0, width: 0.33, height: 0.33 },
    'middle-left': { x: 0, y: 0.33, width: 0.33, height: 0.34 },
    'middle-center': { x: 0.33, y: 0.33, width: 0.34, height: 0.34 },
    'middle-right': { x: 0.67, y: 0.33, width: 0.33, height: 0.34 },
    'bottom-left': { x: 0, y: 0.67, width: 0.33, height: 0.33 },
    'bottom-center': { x: 0.33, y: 0.67, width: 0.34, height: 0.33 },
    'bottom-right': { x: 0.67, y: 0.67, width: 0.33, height: 0.33 },
  };
  return regionMap[region] || regionMap['top-left'];
}

function boxesIntersect(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

// Generate short, concise scene description for promotional videos
export async function generatePromoSceneDescription(
  base64Image: string
): Promise<{ success: boolean; description: string; error?: string }> {
  try {
    const ethnicConsistency = getEthnicConsistencySystemInstruction();
    const systemPrompt = `You are an expert promotional video scriptwriter. Analyze the provided image and write a short, descriptive sentence suitable for a promotional video scene.

Your scene description must be:
- **Action-oriented and engaging**: Describe what's happening in the image
- **Suitable for voiceover**: Natural, conversational tone
- **Professional**: Appropriate for business/marketing videos

Examples:
- "Showcasing the innovative features of our latest smartphone model"
- "A satisfied customer enjoying their morning coffee at our cafe"
- "Team collaboration in a modern, creative workspace environment"
- "Premium product packaging displayed with elegant lighting"

Return exactly one sentence between 8-15 words.

${ethnicConsistency}`;

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = base64Image.match(/data:image\/(\w+);base64/)?.[1] || 'png';

    const contents = [
      {
        inlineData: {
          data: imageData,
          mimeType: `image/${mimeType}`,
        },
      },
      "Analyze this image and write a short scene description (8-15 words) for a promotional video.",
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
      contents: contents,
    });

    const description = response.text?.trim();
    
    if (!description) {
      console.error("Empty response from Gemini");
      return {
        success: false,
        description: "Scene ready for custom narration",
        error: "Empty response from AI"
      };
    }

    // Limit to first sentence if multiple sentences returned
    const firstSentence = description.split(/[.!?]/)[0].trim();
    return {
      success: true,
      description: firstSentence || description
    };
  } catch (error) {
    console.error("Failed to generate promo scene description:", error);
    return {
      success: false,
      description: "Scene ready for custom narration",
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Generate voiceover and music recommendations based on scene descriptions
export async function generatePromoRecommendations(
  sceneDescriptions: string[]
): Promise<{
  success: boolean;
  recommendations?: {
    language: 'bahasa' | 'english' | 'chinese';
    voiceType: 'male' | 'female';
    musicStyle: 'calm' | 'modern' | 'corporate' | 'soft' | 'energetic';
  };
  error?: string;
}> {
  try {
    // Filter out empty descriptions
    const validDescriptions = sceneDescriptions.filter(desc => desc && desc.trim().length > 0);
    
    if (validDescriptions.length === 0) {
      return {
        success: false,
        error: 'No valid scene descriptions provided'
      };
    }

    const combinedText = validDescriptions.join(' ');
    
    const systemPrompt = `You are an expert in promotional video production, specializing in voiceover and music selection.

Analyze the provided scene descriptions and recommend:
1. **Language**: Bahasa Melayu (bahasa), English (english), or Simplified Chinese (chinese)
2. **Voice Type**: Male or Female
3. **Music Style**: Calm, Modern, Corporate, Soft, or Energetic

Consider:
- **Language detection**: Identify the language of the text
- **Content theme**: Business/corporate → formal voice; lifestyle/beauty → softer voice; tech → modern/energetic
- **Tone & mood**: Emotional/family → soft; professional → corporate; youthful → energetic; product intro → calm

Return ONLY a valid JSON object with this exact structure:
{
  "language": "bahasa" | "english" | "chinese",
  "voiceType": "male" | "female",
  "musicStyle": "calm" | "modern" | "corporate" | "soft" | "energetic"
}

Examples:
- "A young woman applies skincare by the window" → {"language": "english", "voiceType": "female", "musicStyle": "soft"}
- "Innovative smartphone features showcased in modern setting" → {"language": "english", "voiceType": "male", "musicStyle": "modern"}
- "Team collaboration in corporate office environment" → {"language": "english", "voiceType": "male", "musicStyle": "corporate"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
      contents: `Analyze these scene descriptions and provide recommendations:\n\n${combinedText}`,
    });

    const resultText = response.text?.trim();
    
    if (!resultText) {
      console.error("Empty response from Gemini for promo recommendations");
      return {
        success: true,
        recommendations: {
          language: 'bahasa',
          voiceType: 'female',
          musicStyle: 'calm'
        }
      };
    }

    const recommendations = JSON.parse(resultText);
    
    // Validate the response structure
    const validLanguages = ['bahasa', 'english', 'chinese'];
    const validVoiceTypes = ['male', 'female'];
    const validMusicStyles = ['calm', 'modern', 'corporate', 'soft', 'energetic'];
    
    if (!validLanguages.includes(recommendations.language) ||
        !validVoiceTypes.includes(recommendations.voiceType) ||
        !validMusicStyles.includes(recommendations.musicStyle)) {
      console.warn("Invalid recommendations format, using defaults");
      return {
        success: true,
        recommendations: {
          language: 'bahasa',
          voiceType: 'female',
          musicStyle: 'calm'
        }
      };
    }

    return {
      success: true,
      recommendations
    };
  } catch (error) {
    console.error("Failed to generate promo recommendations:", error);
    // Return default recommendations on error
    return {
      success: true,
      recommendations: {
        language: 'bahasa',
        voiceType: 'female',
        musicStyle: 'calm'
      }
    };
  }
}

// Generate short marketing text overlays for promo video scenes
export async function generateSceneTextOverlays(
  sceneDescriptions: string[]
): Promise<{
  success: boolean;
  textOverlays?: string[];
  error?: string;
}> {
  try {
    // Filter out empty descriptions
    const validDescriptions = sceneDescriptions.filter(desc => desc && desc.trim().length > 0);
    
    if (validDescriptions.length === 0) {
      return {
        success: false,
        error: 'No valid scene descriptions provided'
      };
    }

    const systemPrompt = `You are an expert in promotional video copywriting, specializing in short, punchy marketing text overlays.

For each scene description provided, generate a SHORT marketing text overlay that:
1. **Maximum 10 words** - Keep it concise and impactful
2. **Persuasive tone** - Suitable for promotional ads, inspiring action
3. **Match the theme** - Align with the product/service described in the scene
4. **No periods** - Do NOT end with periods or full stops
5. **Capitalized first letter** - Use proper capitalization (Title Case optional)

Fallback Rules:
- If scene is vague/empty, use generic branding lines like:
  * "Your Perfect Daily Companion"
  * "Beauty Naturally Delivered"
  * "Inspired by You"
  * "Elevate Every Moment"
  * "Crafted for Excellence"

Return ONLY a valid JSON array of strings (one per scene):
["Text for scene 1", "Text for scene 2", "Text for scene 3"]

Examples:
Scene: "A woman relaxing in a sunny room, holding a serum bottle"
→ "Glow Naturally Every Day"

Scene: "Ingredients like aloe and chamomile shown in close-up"
→ "Gentle Botanicals for Sensitive Skin"

Scene: "Smartphone showcasing innovative features in modern setting"
→ "Innovation That Fits Your Hand"

Scene: "Team collaboration in vibrant office space"
→ "Together We Build Tomorrow"`;

    // Build the prompt with all scene descriptions
    const scenesList = validDescriptions.map((desc, i) => `Scene ${i + 1}: ${desc}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5, // Slightly higher for creative marketing text
        responseMimeType: "application/json",
      },
      contents: `Generate short marketing text overlays for these scenes:\n\n${scenesList}`,
    });

    const resultText = response.text?.trim();
    
    if (!resultText) {
      console.error("Empty response from Gemini for text overlays");
      // Return generic fallback text for each scene
      const fallbacks = [
        "Your Perfect Daily Companion",
        "Elevate Every Moment",
        "Crafted for Excellence",
        "Beauty Naturally Delivered",
        "Inspired by You"
      ];
      return {
        success: true,
        textOverlays: validDescriptions.map((_, i) => fallbacks[i % fallbacks.length])
      };
    }

    const textOverlays = JSON.parse(resultText);
    
    // Validate it's an array
    if (!Array.isArray(textOverlays)) {
      console.warn("Invalid text overlays format (not an array), using defaults");
      const fallbacks = [
        "Your Perfect Daily Companion",
        "Elevate Every Moment",
        "Crafted for Excellence"
      ];
      return {
        success: true,
        textOverlays: validDescriptions.map((_, i) => fallbacks[i % fallbacks.length])
      };
    }

    // Remove periods from the end if present
    const cleanedOverlays = textOverlays.map(text => 
      typeof text === 'string' ? text.replace(/\.$/, '').trim() : text
    );

    return {
      success: true,
      textOverlays: cleanedOverlays
    };
  } catch (error) {
    console.error("Failed to generate scene text overlays:", error);
    // Return generic fallback text on error
    const fallbacks = [
      "Your Perfect Daily Companion",
      "Elevate Every Moment",
      "Crafted for Excellence",
      "Beauty Naturally Delivered",
      "Inspired by You"
    ];
    return {
      success: true,
      textOverlays: sceneDescriptions.map((_, i) => fallbacks[i % fallbacks.length])
    };
  }
}

export async function generateCaptionScriptFromImage(
  base64Image: string,
  brandContext?: any
): Promise<string> {
  try {
    let systemPrompt = `You are an expert visual content creator and marketing copywriter specializing in generating compelling, descriptive captions for images.

Analyze the provided image and generate a detailed, vivid caption script that:
1. **Describes the scene**: Key subjects, mood, atmosphere, lighting, colors
2. **Captures the aesthetic**: Photography style, composition, visual elements
3. **Sets the tone**: Emotional feel, energy, ambiance
4. **Provides context**: What's happening, the story being told

Your caption should be:
- **Descriptive and specific**: Paint a clear picture with words
- **Concise yet detailed**: 2-4 sentences maximum
- **Optimized for AI image generation**: Include style keywords like "cinematic lighting", "soft focus", "vibrant colors", etc.
- **Marketing-focused**: Professional, compelling, suited for commercial use`;

    if (brandContext) {
      systemPrompt += `\n\nBrand Context:\n`;
      if (brandContext.colors?.primary) systemPrompt += `- Primary Color: ${brandContext.colors.primary}\n`;
      if (brandContext.colors?.secondary) systemPrompt += `- Secondary Color: ${brandContext.colors.secondary}\n`;
      if (brandContext.tone) systemPrompt += `- Brand Tone: ${brandContext.tone}\n`;
      if (brandContext.industry) systemPrompt += `- Industry: ${brandContext.industry}\n`;
      systemPrompt += `\nIncorporate the brand's tone and style into your caption when appropriate.`;
    }

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = base64Image.match(/data:image\/(\w+);base64/)?.[1] || 'png';

    const contents = [
      {
        inlineData: {
          data: imageData,
          mimeType: `image/${mimeType}`,
        },
      },
      "Analyze this image and generate a detailed caption script optimized for AI visual generation.",
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: contents,
    });

    console.log("Caption Script Generation Response:", response);

    const script = response.text?.trim();
    
    if (!script) {
      console.error("No text in caption response. Response keys:", Object.keys(response));
      throw new Error("Empty response from Gemini");
    }

    return script;
  } catch (error) {
    console.error("Failed to generate caption script:", error);
    throw new Error(`Caption generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateFusionSuggestion(
  backgroundImageDataUrl: string,
  productImageDataUrl: string
): Promise<string> {
  try {
    const systemPrompt = `You are an expert visual content creator specializing in AI image fusion and product photography.

Analyze the two provided images:
1. **Background Image**: Identify the environment, setting, atmosphere (e.g., beach, marble countertop, wooden desk, bathroom, nature scene, ice surface, etc.)
2. **Product Image**: Identify the product type, size, orientation, and characteristics (e.g., bottle, cosmetic, tech gadget, food item, drink can, etc.)

Generate a SHORT, NATURAL fusion description that explains how to seamlessly blend the product into the background scene.

Requirements:
- **Maximum 25 words**
- Use simple, descriptive English
- Be visually specific and realistic
- Professional tone suitable for marketing
- Include spatial placement (e.g., "on", "beside", "in front of")
- Add atmospheric details if relevant (e.g., "with sunlight", "with water droplets", "in soft lighting")

Example outputs:
- "Place the skincare bottle gently on soft beach sand with sunlight reflecting off ocean waves."
- "Position the perfume bottle on marble counter with blurred bathroom tiles in background."
- "Set the laptop neatly on wooden desk with natural daylight streaming through window."
- "Put the drink can on ice surface with glistening water droplets around it."

If the background context is unclear, generate a neutral professional description:
- "Place the product in the center with a clean and minimal background."

Return ONLY the fusion description text, no additional formatting or explanation.`;

    const backgroundImageData = backgroundImageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const backgroundMimeType = backgroundImageDataUrl.match(/data:image\/(\w+);base64/)?.[1] || 'png';
    
    const productImageData = productImageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const productMimeType = productImageDataUrl.match(/data:image\/(\w+);base64/)?.[1] || 'png';

    const contents = [
      {
        inlineData: {
          data: backgroundImageData,
          mimeType: `image/${backgroundMimeType}`,
        },
      },
      "This is the background image.",
      {
        inlineData: {
          data: productImageData,
          mimeType: `image/${productMimeType}`,
        },
      },
      "This is the product image. Generate a fusion description that explains how to blend the product into the background scene.",
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: contents,
    });

    console.log("Fusion Suggestion Response:", response);

    const suggestion = response.text?.trim();
    
    if (!suggestion) {
      console.error("No text in fusion suggestion response. Response keys:", Object.keys(response));
      throw new Error("Empty response from Gemini");
    }

    return suggestion;
  } catch (error) {
    console.error("Failed to generate fusion suggestion:", error);
    throw new Error(`Fusion suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
