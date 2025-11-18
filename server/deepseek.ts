// DeepSeek AI integration - OpenAI-compatible API
import OpenAI from "openai";

// Initialize DeepSeek client with OpenAI-compatible API
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

/**
 * Generate ad copy using DeepSeek Chat
 */
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
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "Failed to generate ad copy";
  } catch (error) {
    console.error("Error generating ad copy:", error);
    throw new Error(`Failed to generate ad copy: ${error}`);
  }
}

/**
 * Generate brand kit using DeepSeek Chat with JSON response
 */
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

  const systemPrompt = `You are a brand strategy expert. Create a comprehensive BrandKit based on the provided information. Return ONLY valid JSON with: summary (150 words), tagline (10 words max), colors (array of 5 hex colors), and tone (one word: professional/friendly/bold/innovative).`;

  const prompt = `Brand Name: ${brandName}
Industry: ${industry}
Description: ${description}

Create a BrandKit with brand summary, tagline, color palette, and brand tone. Return ONLY the JSON object, no additional text.`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const rawJson = response.choices[0]?.message?.content;

    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("No response from DeepSeek");
    }
  } catch (error) {
    console.error("Error generating BrandKit:", error);
    throw new Error(`Failed to generate BrandKit: ${error}`);
  }
}

/**
 * Generate headlines using DeepSeek Chat
 */
export async function generateHeadlines(params: {
  productName: string;
  productDescription: string;
  tone?: string;
  count?: number;
}): Promise<string[]> {
  const { productName, productDescription, tone, count = 5 } = params;

  const prompt = `Generate ${count} compelling headlines for the following product:

Product Name: ${productName}
Product Description: ${productDescription}
Tone: ${tone || 'professional'}

Requirements:
- Each headline should be attention-grabbing and concise (5-10 words)
- Match the ${tone || 'professional'} tone
- Highlight key benefits or unique selling points
- Be suitable for marketing campaigns

Return ONLY a JSON array of strings, no additional text.`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const rawJson = response.choices[0]?.message?.content;

    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      // Handle both {headlines: [...]} and direct array formats
      return parsed.headlines || parsed;
    } else {
      throw new Error("No response from DeepSeek");
    }
  } catch (error) {
    console.error("Error generating headlines:", error);
    throw new Error(`Failed to generate headlines: ${error}`);
  }
}

/**
 * Rewrite text using DeepSeek Chat
 */
export async function rewriteText(params: {
  text: string;
  tone?: string;
  style?: string;
}): Promise<string> {
  const { text, tone, style } = params;

  const prompt = `Rewrite the following text with these requirements:
${tone ? `Tone: ${tone}` : ''}
${style ? `Style: ${style}` : ''}

Original text:
${text}

Provide an improved version that is more engaging and effective while maintaining the core message.`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "Failed to rewrite text";
  } catch (error) {
    console.error("Error rewriting text:", error);
    throw new Error(`Failed to rewrite text: ${error}`);
  }
}

/**
 * Enhance prompt for image generation
 */
export async function enhancePrompt(prompt: string): Promise<string> {
  const enhancePrompt = `You are an expert at writing prompts for AI image generation. Enhance the following prompt to make it more detailed and effective for generating high-quality images:

Original prompt: ${prompt}

Provide an enhanced version that:
1. Adds specific visual details (lighting, composition, style)
2. Includes technical photography terms when appropriate
3. Maintains the original intent
4. Is optimized for AI image generation

Return ONLY the enhanced prompt text, no explanations.`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: enhancePrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || prompt;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    // Return original prompt if enhancement fails
    return prompt;
  }
}

/**
 * Generate campaign strategy using DeepSeek Chat
 */
export async function generateCampaignStrategy(params: {
  campaignName: string;
  objective: string;
  targetAudience: string;
  budget?: string;
}): Promise<string> {
  const { campaignName, objective, targetAudience, budget } = params;

  const prompt = `Create a comprehensive marketing campaign strategy with the following details:

Campaign Name: ${campaignName}
Objective: ${objective}
Target Audience: ${targetAudience}
${budget ? `Budget: ${budget}` : ''}

Provide a detailed strategy that includes:
1. Campaign overview and goals
2. Target audience analysis
3. Key messaging and positioning
4. Recommended channels and tactics
5. Success metrics and KPIs
6. Timeline and milestones

Format the response in a clear, structured manner.`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "Failed to generate campaign strategy";
  } catch (error) {
    console.error("Error generating campaign strategy:", error);
    throw new Error(`Failed to generate campaign strategy: ${error}`);
  }
}

/**
 * Generate generic text using DeepSeek Chat
 * This is a general-purpose text generation function
 */
export async function generateText(
  prompt: string,
  modelPreference: 'gemini-flash' | 'gemini-pro' = 'gemini-flash'
): Promise<string> {
  try {
    // DeepSeek only has one chat model, so we ignore modelPreference
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "Failed to generate text";
  } catch (error) {
    console.error("Error generating text:", error);
    throw new Error(`Failed to generate text: ${error}`);
  }
}

/**
 * Alias for enhancePrompt to maintain compatibility with existing code
 */
export const optimizePrompt = enhancePrompt;

// Export all functions
export default {
  generateAdCopy,
  generateBrandKit,
  generateHeadlines,
  rewriteText,
  enhancePrompt,
  optimizePrompt,
  generateText,
  generateCampaignStrategy,
};
