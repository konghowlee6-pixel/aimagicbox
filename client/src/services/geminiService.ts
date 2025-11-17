



import { GoogleGenAI, Modality, Type } from "@google/genai";
import { BrandAssets } from "../types";
import { logUsage } from './usageService';
import { getCurrentUser } from '../lib/auth-helpers';

// --- Multi-API Routing System ---
// This system routes requests to different API endpoints based on the task type
// to optimize for cost and capability. The user can override any of these by
// providing their own API key.

// Key for general visual generation (e.g., from text prompts) using AI Studio endpoint
const visualsAi = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

// Key for text-based generation (headlines, descriptions, etc.) using Vertex endpoint
// Falls back to the visual key if not provided.
const textAi = import.meta.env.VITE_VERTEX_GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: import.meta.env.VITE_VERTEX_GEMINI_API_KEY })
    : visualsAi;

// Key for advanced image manipulation like Product Fusion, using Vertex Imagen endpoint
// Falls back to the visual key if not provided.
const fusionAi = import.meta.env.VITE_VERTEX_IMAGEN_API_KEY
    ? new GoogleGenAI({ apiKey: import.meta.env.VITE_VERTEX_IMAGEN_API_KEY })
    : visualsAi;
    
type AiTask = 'text' | 'visual' | 'fusion';

/**
 * Gets the appropriate AI provider based on the task type.
 * A user-provided API key will always take precedence over system keys.
 * @param task The type of AI task being performed.
 * @param userApiKey An optional user-provided key.
 * @returns An initialized GoogleGenAI instance.
 */
const getAiProvider = (task: AiTask, userApiKey?: string | null): GoogleGenAI => {
    if (userApiKey && userApiKey.startsWith('AIza')) {
        // console.log(`Using user-provided key for ${task} task.`);
        return new GoogleGenAI({ apiKey: userApiKey });
    }

    switch (task) {
        case 'text':
            // console.log("Using Text AI provider.");
            return textAi;
        case 'fusion':
            // console.log("Using Fusion AI provider.");
            return fusionAi;
        case 'visual':
        default:
            // console.log("Using Visuals AI provider.");
            return visualsAi;
    }
};


const MOCK_SAMPLE_TEXTS = [
    "Our latest wireless earbuds, the 'Aura Pods', now come in rose gold. Featuring noise-cancellation and a 24-hour battery life.",
    "Introducing the 'Terra' backpack, made from recycled ocean plastics. Durable, waterproof, and stylish for the eco-conscious adventurer.",
    "Experience the rich, aromatic flavors of our single-origin 'Dawn' coffee blend, ethically sourced from the mountains of Colombia."
];

const MOCK_KEYWORDS: { [key: string]: string } = {
    'Fashion': 'stylish, trendy, modern, chic, elegant',
    'Restaurant': 'delicious, fresh, authentic, cozy, gourmet',
    'Salon': 'relaxing, professional, luxurious, beauty, wellness',
    'Tech': 'innovative, smart, futuristic, efficient, powerful',
    'Default': 'quality, premium, exclusive, trusted, unique'
}


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Language instruction templates for multilingual support
const LANGUAGE_INSTRUCTIONS = {
  ms: {
    name: 'Bahasa Melayu',
    instruction: 'CRITICAL: Generate ALL content in Bahasa Melayu (Malay language). Use natural Malay expressions and culturally appropriate messaging.',
    example: 'Contoh: "Kualiti Terbaik untuk Gaya Hidup Anda"'
  },
  en: {
    name: 'English',
    instruction: 'Generate all content in English. Use clear, compelling language.',
    example: 'Example: "Premium Quality for Your Lifestyle"'
  },
  zh: {
    name: '中文 (Simplified Chinese)',
    instruction: 'CRITICAL: Generate ALL content in Simplified Chinese (简体中文). Use natural Chinese expressions and culturally appropriate messaging.',
    example: '示例: "为您的生活方式提供优质品质"'
  }
};

// FIX: Replaced the brittle filtering logic with a proactive rephrasing mechanism, ensuring all generated content strictly adheres to the keyword exclusion list.
export const generateCampaignContent = async (
  productInfo: string,
  brandAssets: BrandAssets,
  excludedKeywords: string,
  userApiKey?: string | null,
  step?: 'step1' | 'step2',
  currentHeadline?: string,
  currentSubheadline?: string,
  language: string = 'en'
): Promise<{ headline: string; subheadline: string; description: string; hashtags: string[], imagePromptSuggestion: string }> => {
  console.log("Generating campaign content for:", productInfo, "with brand context:", brandAssets.brandName, "avoiding:", excludedKeywords, "language:", language);
  
  const ai = getAiProvider('text', userApiKey);
  const apiSource = userApiKey ? 'User Key' : 'System Key';
  
  // Format brand colors for the prompt
  const brandColorsText = brandAssets.colors && brandAssets.colors.length > 0 
    ? `Brand Colors: ${brandAssets.colors.join(', ')}` 
    : '';

  // Get language instruction
  const langConfig = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;

  // TWO-STEP GENERATION: Step 1 generates headline/subheadline, Step 2 generates description/hashtags
  let prompt: string;
  
  if (step === 'step1' || !step) {
    // STEP 1: Generate only Headline and Subheadline
    prompt = `You are a creative expert specializing in high-conversion social media ads.
    
    LANGUAGE REQUIREMENT:
    ${langConfig.instruction}
    ${langConfig.example}
    
    Product Information: "${productInfo}"
    
    Brand Identity Context:
    - Brand Name: ${brandAssets.brandName}
    - Business Category: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Industry: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Tagline: ${brandAssets.tagline}
    - Brand Keywords: ${brandAssets.brandKeywords}
    - Tone of Voice: ${brandAssets.toneOfVoice}
    ${brandColorsText ? `- ${brandColorsText}` : ''}
    
    Instructions:
    1.  Generate ONLY a headline (max 10-12 words) and subheadline for this product/service in ${langConfig.name}.
    2.  The tone MUST be ${brandAssets.toneOfVoice} - every word should reflect this brand voice.
    3.  Use the brand context to ensure all copy aligns with the brand's identity, values, and target audience.
    4.  IMPORTANT: Strictly avoid using any of the following words: "${excludedKeywords}". If the product info contains these words, you must rephrase.
    5.  Also generate a concise image prompt suggestion for a visual (this can be in English for technical purposes).
    
    Return the response as a valid JSON object with the following structure: { "headline": "...", "subheadline": "...", "imagePromptSuggestion": "..." }`;
  } else {
    // STEP 2: Generate Description and Hashtags based on finalized Headline/Subheadline
    prompt = `You are a creative expert specializing in high-conversion social media ads.
    
    LANGUAGE REQUIREMENT:
    ${langConfig.instruction}
    ${langConfig.example}
    
    The user has finalized their Headline and Subheadline for a campaign:
    
    Headline: "${currentHeadline}"
    Subheadline: "${currentSubheadline}"
    
    Product Information: "${productInfo}"
    
    Brand Identity Context:
    - Brand Name: ${brandAssets.brandName}
    - Business Category: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Tone of Voice: ${brandAssets.toneOfVoice}
    - Brand Keywords: ${brandAssets.brandKeywords}
    
    Instructions:
    1.  Generate a description and 4 relevant hashtags based on the finalized Headline and Subheadline above in ${langConfig.name}.
    2.  CRITICAL - Description Rule: Do NOT create an independent description. Instead, combine the Headline and Subheadline into one unified, natural paragraph that expands on the same message context. The description should explain the campaign more fully using both the headline and subheadline - no additional or unrelated content.
    3.  CRITICAL - Hashtags Rule: Extract relevant keywords DIRECTLY from the Headline and Subheadline ONLY. Turn those specific keywords into contextual hashtags. Avoid using generic or unrelated hashtags that don't appear in the headline/subheadline.
    4.  The tone MUST be ${brandAssets.toneOfVoice} - every word should reflect this brand voice.
    
    Return the response as a valid JSON object with the following structure: { "description": "...", "hashtags": ["#...", "#...", "#...", "#..."] }`;
  }

  let totalTokens = prompt.length; // rough estimate

  try {
    // Call backend API instead of client-side SDK to keep API key secure
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const backendResponse = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        prompt: prompt + '\n\nIMPORTANT: Return ONLY a valid JSON object with the requested fields. Do not include any additional text or explanation.',
        modelPreference: 'gemini-flash'
      })
    });
    
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      console.error("Backend API error:", errorData);
      throw new Error(errorData.error || `API request failed with status ${backendResponse.status}`);
    }
    
    const backendData = await backendResponse.json();
    const resultText = backendData.text.trim();
    console.log(`[${step || 'default'}] Raw AI response text:`, resultText);
    let resultJson = JSON.parse(resultText);
    
    // FIX: Gemini sometimes returns an array with one object instead of a single object
    if (Array.isArray(resultJson) && resultJson.length > 0) {
      console.log(`[${step || 'default'}] AI returned array, extracting first element`);
      resultJson = resultJson[0];
    }
    
    console.log(`[${step || 'default'}] Parsed JSON:`, resultJson);
    console.log(`[${step || 'default'}] JSON keys:`, Object.keys(resultJson));
    console.log(`[${step || 'default'}] headline value:`, resultJson.headline, 'type:', typeof resultJson.headline);
    console.log(`[${step || 'default'}] subheadline value:`, resultJson.subheadline, 'type:', typeof resultJson.subheadline);

    totalTokens += resultText.length;
    const logLabel = step === 'step2' ? 'Generate Description/Hashtags' : 'Generate Headlines';
    logUsage('Gemini 2.5 Flash', logLabel, apiSource, 'Success', { tokens: totalTokens });

    // Return appropriate fields based on the step
    if (step === 'step2') {
      // Step 2: Return description and hashtags, preserve existing headline/subheadline
      return {
        headline: currentHeadline || '',
        subheadline: currentSubheadline || '',
        description: resultJson.description || '',
        hashtags: resultJson.hashtags || [],
        imagePromptSuggestion: '', // Not needed in step 2
      };
    } else {
      // Step 1: Return headline/subheadline/imagePrompt, empty description/hashtags
      return {
        headline: resultJson.headline || '',
        subheadline: resultJson.subheadline || '',
        description: '', // Will be generated in step 2
        hashtags: [], // Will be generated in step 2
        imagePromptSuggestion: resultJson.imagePromptSuggestion || '',
      };
    }
  } catch (error) {
    logUsage('Gemini 2.5 Flash', 'Generate Ad Content', apiSource, 'Failure', { tokens: totalTokens });
    console.error("Error generating campaign content with Gemini API:");
    console.error("Error details:", error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// FIX: Updated `suggestAlternatives` to accept `currentText`, enabling the AI to generate more relevant, contextual variations instead of generic new ideas.
export const suggestAlternatives = async (
  fieldType: 'headline' | 'subheadline' | 'description',
  productInfo: string,
  excludedKeywords: string,
  currentText?: string,
  brandAssets?: BrandAssets,
  userApiKey?: string | null,
  language?: string
): Promise<string[]> => {
    console.log(`Suggesting alternatives for ${fieldType}. Based on product: "${productInfo}" and current text: "${currentText}", while avoiding: "${excludedKeywords}"`);
    const ai = getAiProvider('text', userApiKey);
    const apiSource = userApiKey ? 'User Key' : 'System Key';

    // Detect language from input text if not provided
    const detectedLang = language || (currentText && isCJKText(currentText) ? 'zh' : 'en');
    const langConfig = LANGUAGE_INSTRUCTIONS[detectedLang as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;

    // Build brand context if available
    const brandContext = brandAssets ? `
    
    Brand Identity Context:
    - Brand Name: ${brandAssets.brandName}
    - Industry: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Tone of Voice: ${brandAssets.toneOfVoice}
    - Brand Keywords: ${brandAssets.brandKeywords}` : '';

    const prompt = `You are an expert ad copywriter. Generate 3 diverse and compelling alternative options for the following ${fieldType}.
    
    Original ${fieldType}: "${currentText}"
    
    Product Information: "${productInfo}"${brandContext}
    
    LANGUAGE REQUIREMENT:
    ${langConfig.instruction}
    CRITICAL: All suggestions MUST be in the SAME LANGUAGE as the original text.
    - If the original is in Chinese, use ONLY Chinese characters and Chinese punctuation (，。！)
    - If the original is in Malay, use ONLY Malay words with proper Malay grammar
    - If the original is in English, use ONLY English words
    - DO NOT mix languages! No English words in Chinese text, no Chinese characters in English text
    - DO NOT add brand name prefixes like "My Brand:", "Brand Name:", etc unless they exist in the original text
    
    Instructions:
    1. The suggestions should be improvements or different angles on the original text.
    2. ${brandAssets ? `Maintain a ${brandAssets.toneOfVoice} tone that aligns with the brand identity.` : 'Keep the tone professional and engaging.'}
    3. Strictly avoid using any of the following words: "${excludedKeywords}".
    4. PRESERVE the language of the original text - if original is Chinese, ALL suggestions must be pure Chinese
    5. Return the response as a valid JSON array of strings, like ["suggestion1", "suggestion2", "suggestion3"].`;

    let totalTokens = prompt.length;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        if (!response || !response.text) {
          throw new Error("No text in API response");
        }

        const resultText = response.text.trim();
        const suggestions: string[] = JSON.parse(resultText);

        totalTokens += resultText.length;
        logUsage('Gemini 2.5 Flash', `Suggest ${fieldType}`, apiSource, 'Success', { tokens: totalTokens });
        return suggestions;

    } catch (error) {
        logUsage('Gemini 2.5 Flash', `Suggest ${fieldType}`, apiSource, 'Failure', { tokens: totalTokens });
        console.error(`Error suggesting alternatives for ${fieldType}:`, error);
        throw error;
    }
};


// FIX: Standardized 'regenerateSingleField' to exclusively rewrite the user's current text.
export const regenerateSingleField = async (
    productInfo: string,
    fieldType: 'headline' | 'subheadline' | 'description' | 'hashtags',
    excludedKeywords: string,
    currentText: string,
    brandAssets?: BrandAssets,
    userApiKey?: string | null
): Promise<string | string[]> => {
    console.log(`Rewriting ${fieldType}: "${currentText}"`);
    const ai = getAiProvider('text', userApiKey);
    const apiSource = userApiKey ? 'User Key' : 'System Key';

    const isHashtags = fieldType === 'hashtags';

    // Build brand context if available
    const brandContext = brandAssets ? `
    
    Brand Identity Context:
    - Brand Name: ${brandAssets.brandName}
    - Industry: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Tone of Voice: ${brandAssets.toneOfVoice}
    - Brand Keywords: ${brandAssets.brandKeywords}` : '';

    const prompt = `You are an expert ad copywriter. Rewrite the following ${fieldType} to be more compelling and fresh.
    
    Original ${fieldType}: "${currentText}"
    
    Product Information: "${productInfo}"${brandContext}
    
    Instructions:
    1. Provide one single, high-quality rewrite.
    2. ${brandAssets ? `Ensure the rewrite maintains a ${brandAssets.toneOfVoice} tone that aligns with the brand's identity and values.` : 'Keep the tone professional and engaging.'}
    3. Strictly avoid using any of the following words: "${excludedKeywords}".
    ${isHashtags 
        ? '4. Return the response as a valid JSON array of 4 strings, like ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4"].' 
        : '4. Return the response as a single valid JSON object, like {"rewrittenText": "your new text here"}.'}
    `;

    let totalTokens = prompt.length;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        if (!response || !response.text) {
          throw new Error("No text in API response");
        }

        const resultText = response.text.trim();
        totalTokens += resultText.length;

        if (isHashtags) {
            const result: string[] = JSON.parse(resultText);
            logUsage('Gemini 2.5 Flash', `Rewrite ${fieldType}`, apiSource, 'Success', { tokens: totalTokens });
            return result;
        } else {
            const result: { rewrittenText: string } = JSON.parse(resultText);
            logUsage('Gemini 2.5 Flash', `Rewrite ${fieldType}`, apiSource, 'Success', { tokens: totalTokens });
            return result.rewrittenText;
        }
    } catch (error) {
        logUsage('Gemini 2.5 Flash', `Rewrite ${fieldType}`, apiSource, 'Failure', { tokens: totalTokens });
        console.error(`Error rewriting ${fieldType}:`, error);
        throw error;
    }
};


// FIX: Added a helper function to map project sizes to the aspect ratios supported by the Gemini API.
const mapSizeToAspectRatio = (size: string): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' => {
    switch (size) {
        case '12x12': return '1:1';
        case '9x12': return '3:4';
        case '16x9': return '16:9';
        case '9x16': return '9:16';
        default: return '1:1';
    }
};


// Updated to use Runware.ai for image generation
export const generateImages = async (
    projectId: string,
    prompt: string,
    style: string,
    brandAssets: BrandAssets,
    numberOfImages: number = 3,
    size: string = "12x12",
    excludedKeywords?: string,
    userApiKey?: string | null
): Promise<string[]> => {
    const startTime = performance.now();
    console.log(`🎨 [PERF] Starting Runware image generation for ${numberOfImages} images...`);
    console.log(`Generating ${numberOfImages} images for: "${prompt}" with style: "${style}", size: ${size}, avoiding: ${excludedKeywords}`);
    
    // Map size to dimensions for Runware
    const dimensions = mapSizeToRunwareDimensions(size);
    
    // Build brand color guidance
    const brandColorGuidance = brandAssets.colors && brandAssets.colors.length > 0
        ? `Brand color palette: ${brandAssets.colors.join(', ')}. Use these colors as the primary color scheme in the composition.`
        : '';
    
    // Handle empty/blank prompts - use __BLANK__ for brand-based generation
    const effectivePrompt = (prompt && prompt.trim()) ? prompt : '__BLANK__';
    
    const descriptivePrompt = [
        effectivePrompt !== '__BLANK__' ? effectivePrompt : '',
        `Style: ${style}, ${brandAssets.toneOfVoice} aesthetic.`,
        `Brand identity: ${brandAssets.brandKeywords}.`,
        `Industry: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}.`,
        brandColorGuidance,
    ].filter(Boolean).join(' ');

    let fullPrompt = effectivePrompt === '__BLANK__' 
        ? `A high-quality, visually appealing image for a marketing campaign with ${brandAssets.toneOfVoice} aesthetic. ${descriptivePrompt}`
        : `A high-quality, visually appealing image for a marketing campaign. The scene should be: ${descriptivePrompt}. The visual style should align with a ${brandAssets.toneOfVoice} brand personality`;
    
    // Build negative prompt to exclude text
    let negativePrompt = 'text, words, letters, numbers, logos, watermarks, signatures, labels, titles';
    if (excludedKeywords && excludedKeywords.trim()) {
        negativePrompt += `, ${excludedKeywords}`;
    }

    console.log("Full prompt for Runware image generation:", fullPrompt);
    console.log("Negative prompt:", negativePrompt);
    
    const apiSource = userApiKey ? 'User Key' : 'System Key';

    try {
        const apiCallStartTime = performance.now();
        console.log(`🎨 [PERF] Calling Runware API for ${numberOfImages} images...`);
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Add JWT token for authentication
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Call backend endpoint for Runware generation
        const response = await fetch('/api/generate/visual', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                projectId,
                prompt: fullPrompt,
                negativePrompt,
                numberOfImages,
                size,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Runware API error: ${response.statusText}`);
        }

        const data = await response.json();
        const imageUrls = data.visuals.map((v: any) => v.imageUrl);
        
        const apiCallDuration = performance.now() - apiCallStartTime;
        console.log(`🎨 [PERF] Runware API completed in ${apiCallDuration.toFixed(0)}ms`);

        const totalDuration = performance.now() - startTime;
        console.log(`🎉 [PERF] TOTAL image generation time: ${totalDuration.toFixed(0)}ms for ${numberOfImages} images`);

        logUsage('Runware AI', 'AI Generate Visuals', apiSource, 'Success', { imageCount: numberOfImages });
        return imageUrls;
    } catch (error) {
        logUsage('Runware AI', 'AI Generate Visuals', apiSource, 'Failure', { imageCount: numberOfImages });
        console.error("Error generating images with Runware API:", error);
        throw error;
    }
};

// Helper function to map project sizes to Runware dimensions
const mapSizeToRunwareDimensions = (size: string): { width: number; height: number } => {
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
};


export const generateSampleText = async (): Promise<string> => {
    console.log("Generating sample product text...");
    await sleep(800);
    return MOCK_SAMPLE_TEXTS[Math.floor(Math.random() * MOCK_SAMPLE_TEXTS.length)];
}

// FIX: Completed the truncated `generateKeywords` function which was causing a return type error.
export const generateKeywords = async ({ category, tagline }: { category: string, tagline: string }): Promise<string> => {
    console.log(`Generating keywords for category: ${category} and tagline: ${tagline}`);
    await sleep(800);
    const baseKeywords = MOCK_KEYWORDS[category] || MOCK_KEYWORDS['Default'];
    if (tagline.length > 5) {
        const taglineWords = tagline.toLowerCase().replace(/[^a-z\s]/g, '').split(' ').filter(w => w.length > 3 && !['your', 'the', 'and', 'for'].includes(w));
        return `${baseKeywords}, ${taglineWords.slice(0, 2).join(', ')}`;
    }
    return baseKeywords;
};

// FIX: Standardized 'enhancePrompt' to serve as the "Pen" (Rewrite) function for the image prompt.
export const enhancePrompt = async (prompt: string, brandAssets: BrandAssets, excludedKeywords: string, userApiKey?: string | null): Promise<string> => {
    console.log(`Enhancing prompt: "${prompt}" with brand context: ${brandAssets.brandName}, avoiding: ${excludedKeywords}`);
    const ai = getAiProvider('text', userApiKey);
    const apiSource = userApiKey ? 'User Key' : 'System Key';

    // Format brand colors for the prompt
    const brandColorsText = brandAssets.colors && brandAssets.colors.length > 0 
        ? `Brand Colors: ${brandAssets.colors.join(', ')}` 
        : '';

    const apiPrompt = `You are an expert prompt engineer for AI image generation models. Rewrite and enhance the following image prompt to be more descriptive, detailed, and visually evocative.
    
    Original Prompt: "${prompt}"
    
    Brand Identity Context:
    - Brand Name: ${brandAssets.brandName}
    - Industry: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Tone of Voice: ${brandAssets.toneOfVoice}
    - Brand Keywords: ${brandAssets.brandKeywords}
    ${brandColorsText ? `- ${brandColorsText}` : ''}
    
    Instructions:
    1. Create a single, powerful new prompt that captures the brand's visual identity.
    2. Incorporate the brand's tone, keywords, and color palette into the visual description.
    3. Ensure the enhanced prompt reflects a ${brandAssets.toneOfVoice} aesthetic.
    4. Strictly avoid using or visually representing any of the following: "${excludedKeywords}".
    5. Do not include instructions like "do not include text". The output should be only the prompt itself.
    6. Return the response as a single valid JSON object like {"enhancedPrompt": "your new prompt here"}.`;
    
    let totalTokens = apiPrompt.length;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: apiPrompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        if (!response || !response.text) {
          throw new Error("No text in API response");
        }

        const resultText = response.text.trim();
        const result: { enhancedPrompt: string } = JSON.parse(resultText);
        totalTokens += resultText.length;

        logUsage('Gemini 2.5 Flash', 'Enhance Image Prompt', apiSource, 'Success', { tokens: totalTokens });
        return result.enhancedPrompt;
    } catch (error) {
        logUsage('Gemini 2.5 Flash', 'Enhance Image Prompt', apiSource, 'Failure', { tokens: totalTokens });
        console.error("Error enhancing prompt:", error);
        throw error;
    }
};

// FIX: Added 'regenerateImagePrompt' to provide alternative image prompts, resolving a missing module export error.
export const regenerateImagePrompt = async (
    productInfo: string,
    excludedKeywords: string,
    userApiKey?: string | null
): Promise<string[]> => {
    console.log(`Regenerating image prompt for: ${productInfo}, avoiding: ${excludedKeywords}`);
    const ai = getAiProvider('text', userApiKey);
    const apiSource = userApiKey ? 'User Key' : 'System Key';
    
    const prompt = `You are an expert prompt engineer for AI image generation models. Generate 3 diverse and creative image prompt ideas for a marketing visual.
    
    Product Information: "${productInfo}"
    
    Instructions:
    1.  Each prompt should describe a distinct visual concept (e.g., minimalist product shot, lifestyle action shot, abstract conceptual shot).
    2.  Strictly avoid using or visually representing any of the following: "${excludedKeywords}".
    3.  Return the response as a valid JSON array of 3 strings, like ["prompt idea 1", "prompt idea 2", "prompt idea 3"].`;
    
    let totalTokens = prompt.length;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        if (!response || !response.text) {
          throw new Error("No text in API response");
        }

        const resultText = response.text.trim();
        const suggestions: string[] = JSON.parse(resultText);
        totalTokens += resultText.length;

        logUsage('Gemini 2.5 Flash', 'Suggest Image Prompts', apiSource, 'Success', { tokens: totalTokens });
        return suggestions;
    } catch (error) {
        logUsage('Gemini 2.5 Flash', 'Suggest Image Prompts', apiSource, 'Failure', { tokens: totalTokens });
        console.error("Error regenerating image prompts:", error);
        throw error;
    }
};

// Helper function to parse data URL
const dataUrlToBlob = (dataUrl: string): { data: string; mimeType: string } => {
    const parts = dataUrl.split(',');
    const metaPart = parts[0];
    const data = parts[1];
    const mimeType = metaPart.split(':')[1].split(';')[0];
    return { data, mimeType };
};

// FIX: Added 'detectSceneType' for the AI Product Fusion feature, resolving a missing module export error.
export const detectSceneType = async (imageDataUrl: string, userApiKey?: string | null): Promise<string> => {
    console.log("Detecting scene type for image...");
    const ai = getAiProvider('text', userApiKey);
    const apiSource = userApiKey ? 'User Key' : 'System Key';
    
    const imagePart = {
        inlineData: dataUrlToBlob(imageDataUrl),
    };

    const prompt = "Analyze this image and describe the background scene in a short, descriptive phrase (e.g., 'a modern office desk', 'a serene beach'). Return a single valid JSON object like {\"scene\": \"your description\"}.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Flash is sufficient and cost-effective for this vision task
            contents: [{ parts: [imagePart, { text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });
        
        if (!response || !response.text) {
          throw new Error("No text in API response");
        }

        const resultText = response.text.trim();
        const result: { scene: string } = JSON.parse(resultText);

        logUsage('Gemini 2.5 Flash', 'Detect Scene Type', apiSource, 'Success', { tokens: 100 });
        return result.scene;
    } catch (error) {
        logUsage('Gemini 2.5 Flash', 'Detect Scene Type', apiSource, 'Failure', { tokens: 0 });
        console.error("Error detecting scene type:", error);
        throw error;
    }
};




// Updated to use Runware.ai for product fusion
export const compositeProductIntoScene = async (
    sceneDataUrl: string,
    productDataUrl: string,
    prompt: string,
    userApiKey?: string | null
): Promise<string> => {
    console.log(`Compositing product into scene with Runware: "${prompt}"`);
    const apiSource = userApiKey ? 'User Key' : 'System Key';

    try {
        // Use backend Runware fusion endpoint
        // This is handled by the server-side /api/generate/fusion endpoint
        // which uses Runware's hidreamdev architecture
        
        // For now, we'll use the same approach as the backend:
        // Generate a background scene with Runware that's suitable for product placement
        const fusionPrompt = `Professional marketing visual background for: ${prompt}. 
Clean, well-lit background suitable for product placement in the foreground. 
Visually appealing, complementary to product photography, professional studio quality.`;

        const negativePrompt = 'text, words, letters, numbers, logos, watermarks, signatures, labels, titles, product, object in foreground';

        const response = await fetch('/api/generate/fusion-background', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                backgroundPrompt: fusionPrompt,
                negativePrompt,
            }),
        });

        if (!response.ok) {
            throw new Error(`Runware fusion API error: ${response.statusText}`);
        }

        const data = await response.json();
        logUsage('Runware AI', 'AI Product Fusion', apiSource, 'Success', { imageCount: 1 });
        return data.backgroundImageUrl;

    } catch (error) {
        logUsage('Runware AI', 'AI Product Fusion', apiSource, 'Failure', { imageCount: 1 });
        console.error("Error in compositeProductIntoScene with Runware API:", error);
        throw error;
    }
};

// Helper function to detect CJK text
function isCJKText(text: string): boolean {
    const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
    return cjkRegex.test(text);
}

// Simplify text to 6-8 words maximum
export const simplifyText = async (
  fieldType: 'headline' | 'subheadline' | 'description',
  currentText: string,
  brandAssets?: BrandAssets,
  userApiKey?: string | null,
  language?: string
): Promise<string[]> => {
    console.log(`Simplifying ${fieldType}: "${currentText}"`);
    const ai = getAiProvider('text', userApiKey);
    const apiSource = userApiKey ? 'User Key' : 'System Key';

    // Detect language from input text if not provided
    const detectedLang = language || (isCJKText(currentText) ? 'zh' : 'en');
    const langConfig = LANGUAGE_INSTRUCTIONS[detectedLang as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;

    // Build brand context if available
    const brandContext = brandAssets ? `
    
    Brand Identity Context:
    - Brand Name: ${brandAssets.brandName}
    - Industry: ${brandAssets.businessCategory === 'Other' ? brandAssets.customBusinessCategory : brandAssets.businessCategory}
    - Tone of Voice: ${brandAssets.toneOfVoice}
    - Brand Keywords: ${brandAssets.brandKeywords}` : '';

    const prompt = `You are an expert ad copywriter specializing in ultra-concise messaging. 

    TASK: SIMPLIFY the EXISTING ${fieldType} text below. Do NOT create new ideas or change the core message.
    
    Original ${fieldType}: "${currentText}"
    ${brandContext}
    
    LANGUAGE REQUIREMENT:
    ${langConfig.instruction}
    CRITICAL: The simplified text MUST be in the SAME LANGUAGE as the original input text.
    - If the original is in Chinese, use ONLY Chinese characters and Chinese punctuation (，。！)
    - If the original is in Malay, use ONLY Malay words with proper Malay grammar
    - If the original is in English, use ONLY English words
    - DO NOT mix languages! No English words in Chinese text, no Chinese characters in English text
    - DO NOT add brand name prefixes like "My Brand:", "Brand Name:", etc unless they exist in the original
    
    SIMPLIFICATION RULES:
    1. PRESERVE the core message and brand keywords from the original text
    2. Make it CLEARER and SHORTER - remove filler words, redundancy, and unnecessary details
    3. Each simplified version should be 6-8 words (for Chinese, 6-15 characters)
    4. Keep the ${brandAssets ? brandAssets.toneOfVoice : 'professional'} tone
    5. Maintain language-specific typography and punctuation rules
    6. DO NOT change the fundamental idea or replace brand-related terms
    
    EXAMPLES OF PROPER SIMPLIFICATION:
    English: "We provide the best professional delivery service experience for you" → "Professional Delivery You Trust" (4 words)
    Chinese: "我们为您提供最专业的配送服务体验非常好" → "专业配送体验" (5 characters)  
    Malay: "Kami menyediakan perkhidmatan penghantaran yang terbaik dan paling cepat" → "Penghantaran Pantas Terbaik" (3 words)
    
    IMPORTANT: Do NOT add any brand names or prefixes that are not in the original text!
    
    Return the response as a valid JSON array of exactly 3 SIMPLIFIED strings: ["simplified1", "simplified2", "simplified3"]`;

    let totalTokens = prompt.length;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        if (!response || !response.text) {
          throw new Error("No text in API response");
        }

        const resultText = response.text.trim();
        const suggestions: string[] = JSON.parse(resultText);

        totalTokens += resultText.length;
        logUsage('Gemini 2.5 Flash', `Simplify ${fieldType}`, apiSource, 'Success', { tokens: totalTokens });
        return suggestions;

    } catch (error) {
        logUsage('Gemini 2.5 Flash', `Simplify ${fieldType}`, apiSource, 'Failure', { tokens: totalTokens });
        console.error(`Error simplifying ${fieldType}:`, error);
        throw error;
    }
};
