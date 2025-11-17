// Vertex AI API integration for advanced smart text generation and AI Fusion
// Uses REST API with system_instruction for improved accuracy

interface VertexAIRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
}

interface VertexAIResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

const VERTEX_API_KEY = process.env.VERTEX_API_KEY || "";
const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID || "";

if (!VERTEX_API_KEY || !VERTEX_PROJECT_ID) {
  console.warn("Warning: VERTEX_API_KEY or VERTEX_PROJECT_ID not configured");
}

// Base URL for Vertex AI Gemini API
const getVertexEndpoint = (model: string = "gemini-2.5-pro") => {
  return `https://us-central1-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:generateContent`;
};

async function callVertexAI(
  prompt: string,
  systemInstruction?: string,
  model: string = "gemini-2.5-pro"
): Promise<string> {
  const endpoint = getVertexEndpoint(model);
  
  const requestBody: VertexAIRequest = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  requestBody.generationConfig = {
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 2048,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": VERTEX_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
    }

    const data: VertexAIResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Vertex AI");
    }

    const text = data.candidates[0]?.content?.parts[0]?.text;
    if (!text) {
      throw new Error("Empty response from Vertex AI");
    }

    return text;
  } catch (error) {
    console.error("Error calling Vertex AI:", error);
    throw error;
  }
}

/**
 * Smart Text Rewriting - Optimizes keywords and text with advanced contextual understanding
 */
export async function rewriteTextWithVertex(params: {
  originalText: string;
  context?: string;
  targetStyle?: "professional" | "casual" | "persuasive" | "technical";
}): Promise<string> {
  const { originalText, context, targetStyle = "professional" } = params;

  const systemInstruction = `You are an expert copywriter and content optimizer specializing in marketing and advertising text. Your mission is to transform basic keywords or phrases into compelling, conversion-focused content.

Key Guidelines:
- Maintain the core message and intent
- Enhance clarity, persuasiveness, and emotional appeal
- Optimize for ${targetStyle} tone
- Add relevant details that increase engagement
- Keep output concise but impactful
- Output only the rewritten text, no explanations or metadata`;

  const prompt = `Rewrite and optimize this text: "${originalText}"

${context ? `Context: ${context}` : ''}
Target Style: ${targetStyle}

Provide the optimized version:`;

  try {
    const rewrittenText = await callVertexAI(prompt, systemInstruction, "gemini-2.5-pro");
    return rewrittenText.trim();
  } catch (error) {
    console.error("Error in rewriteTextWithVertex:", error);
    throw new Error(`Failed to rewrite text with Vertex AI: ${error}`);
  }
}

/**
 * Advanced Product Fusion - Generates intelligent background descriptions for product photos
 */
export async function generateFusionBackgroundWithVertex(params: {
  productDescription: string;
  backgroundTheme: string;
  mood?: string;
  brandContext?: string;
}): Promise<string> {
  const { productDescription, backgroundTheme, mood = "professional", brandContext } = params;

  const systemInstruction = `You are a professional photography and visual design expert specializing in product photography and composite imagery. Your task is to create detailed background scene descriptions that will perfectly complement product photos.

Key Guidelines:
- Create backgrounds that enhance the product without overwhelming it
- Consider lighting, color harmony, and visual balance
- Ensure the background supports the product's value proposition
- Maintain professional composition and aesthetic quality
- Focus on realistic, achievable visual elements
- Output only the background description, optimized for image generation AI`;

  const prompt = `Create a detailed background scene description for product photography:

Product: ${productDescription}
Background Theme: ${backgroundTheme}
Mood: ${mood}
${brandContext ? `Brand Context: ${brandContext}` : ''}

Generate a comprehensive background description that will work perfectly for AI image generation, ensuring the product remains the hero while the background adds professional context and appeal:`;

  try {
    const backgroundDescription = await callVertexAI(prompt, systemInstruction, "gemini-2.5-pro");
    return backgroundDescription.trim();
  } catch (error) {
    console.error("Error in generateFusionBackgroundWithVertex:", error);
    throw new Error(`Failed to generate fusion background with Vertex AI: ${error}`);
  }
}

/**
 * Contextual Copywriting - Advanced ad copy generation with platform-specific optimization
 */
export async function generateContextualCopyWithVertex(params: {
  platform: string;
  productName: string;
  productDescription: string;
  targetAudience?: string;
  tone?: string;
  brandVoice?: string;
  callToAction?: string;
}): Promise<{
  headline: string;
  body: string;
  cta: string;
}> {
  const {
    platform,
    productName,
    productDescription,
    targetAudience,
    tone = "professional",
    brandVoice,
    callToAction,
  } = params;

  const systemInstruction = `You are an expert advertising copywriter with deep expertise in platform-specific ad optimization. You understand the nuances of different advertising platforms (Facebook, Instagram, Google Ads, Twitter/X, LinkedIn, TikTok) and create copy that maximizes engagement and conversions.

Key Guidelines:
- Match platform best practices and character limits
- Create attention-grabbing headlines that stop scrolling
- Write compelling body copy that builds desire
- Include strong, action-oriented CTAs
- Optimize for ${tone} tone and ${platform} audience behavior
- Use psychological triggers appropriate for the platform
- Return JSON format: { "headline": "...", "body": "...", "cta": "..." }`;

  const prompt = `Create optimized ad copy for ${platform}:

Product Name: ${productName}
Product Description: ${productDescription}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
Tone: ${tone}
${brandVoice ? `Brand Voice: ${brandVoice}` : ''}
${callToAction ? `Preferred CTA: ${callToAction}` : ''}

Generate platform-optimized copy with headline, body, and call-to-action that will drive conversions on ${platform}:`;

  try {
    const response = await callVertexAI(prompt, systemInstruction, "gemini-2.5-pro");
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response);
      if (parsed.headline && parsed.body && parsed.cta) {
        return parsed;
      }
    } catch {
      // If JSON parsing fails, extract structured content from text
      const lines = response.split('\n').filter(line => line.trim());
      return {
        headline: lines[0] || productName,
        body: lines.slice(1, -1).join(' ') || productDescription,
        cta: lines[lines.length - 1] || "Learn More",
      };
    }

    // Fallback
    return {
      headline: productName,
      body: productDescription,
      cta: "Learn More",
    };
  } catch (error) {
    console.error("Error in generateContextualCopyWithVertex:", error);
    throw new Error(`Failed to generate contextual copy with Vertex AI: ${error}`);
  }
}

export { callVertexAI };
