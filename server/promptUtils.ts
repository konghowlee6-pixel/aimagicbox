/**
 * Prompt Utilities for AI Image/Video Generation
 * 
 * Enforces strict ethnic consistency for Southeast Asian market:
 * - All human subjects must present as Southeast Asian (Chinese, Malay, Indian, or Pan-Asian)
 * - Excludes Western/Caucasian appearances
 */

/**
 * Southeast Asian Ethnic Consistency Rule
 * Applied to all AI-generated images and videos featuring human subjects
 */
const ETHNIC_CONSISTENCY_POSITIVE = `If any person or human face is generated in the image, strictly generate Southeast Asian / Pan-Asian appearances only. Ethnicity must include: Chinese (华人), Malay (including headscarf/tudung for women), Indian (South Asian), or mixed Pan-Asia facial features. Southeast Asian skin tones, facial structures, and characteristics.`;

const ETHNIC_CONSISTENCY_NEGATIVE = `Strictly exclude: European, American, white, Caucasian, light-skinned Western, blonde hair, blue/green eyes, Nordic, Scandinavian, Anglo, Celtic, Mediterranean European appearances. No Western/Eurocentric facial features.`;

/**
 * Add ethnic consistency to a Runware prompt
 * @param positivePrompt - The original positive prompt
 * @param negativePrompt - The original negative prompt (optional)
 * @returns Enhanced prompts with ethnic consistency rules
 */
export function enforceEthnicConsistency(
  positivePrompt: string,
  negativePrompt?: string
): { positivePrompt: string; negativePrompt: string } {
  // Preserve __BLANK__ sentinel (special Runware keyword for no prompt)
  if (positivePrompt === '__BLANK__' || !positivePrompt || positivePrompt.trim() === '') {
    return {
      positivePrompt: positivePrompt || '__BLANK__',
      negativePrompt: negativePrompt || ETHNIC_CONSISTENCY_NEGATIVE,
    };
  }

  // Add ethnic consistency to positive prompt
  const enhancedPositive = `${positivePrompt} ${ETHNIC_CONSISTENCY_POSITIVE}`;

  // Add ethnic exclusions to negative prompt
  const enhancedNegative = negativePrompt
    ? `${negativePrompt}, ${ETHNIC_CONSISTENCY_NEGATIVE}`
    : ETHNIC_CONSISTENCY_NEGATIVE;

  return {
    positivePrompt: enhancedPositive,
    negativePrompt: enhancedNegative,
  };
}

/**
 * Add ethnic consistency to a Gemini text prompt
 * @param prompt - The original Gemini prompt
 * @returns Enhanced prompt with ethnic consistency rules
 */
export function enforceGeminiEthnicConsistency(prompt: string): string {
  return `${prompt}\n\nIMPORTANT: ${ETHNIC_CONSISTENCY_POSITIVE} ${ETHNIC_CONSISTENCY_NEGATIVE}`;
}

/**
 * Add ethnic consistency to a Gemini system instruction
 * @returns System instruction for ethnic consistency
 */
export function getEthnicConsistencySystemInstruction(): string {
  return `CRITICAL INSTRUCTION: When generating any content involving people or human subjects: ${ETHNIC_CONSISTENCY_POSITIVE} ${ETHNIC_CONSISTENCY_NEGATIVE}`;
}

/**
 * Check if a prompt likely involves human subjects
 * Used to determine if ethnic consistency rules should be applied
 * @param prompt - The prompt to check
 * @returns True if prompt likely involves humans
 */
export function promptInvolvesHumans(prompt: string): boolean {
  const humanKeywords = [
    'person', 'people', 'human', 'face', 'portrait', 'model',
    'man', 'woman', 'boy', 'girl', 'child', 'baby',
    'customer', 'user', 'worker', 'professional', 'student',
    'family', 'couple', 'group', 'crowd', 'audience',
    'selfie', 'headshot', 'profile', 'character',
    // Malay/Chinese keywords
    'tudung', 'headscarf', 'hijab', '华人', 'muslim'
  ];

  const lowerPrompt = prompt.toLowerCase();
  return humanKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Smart ethnic consistency enforcement
 * Only adds rules if prompt likely involves humans
 * @param positivePrompt - The original positive prompt
 * @param negativePrompt - The original negative prompt (optional)
 * @returns Enhanced prompts (only modified if humans detected)
 */
export function smartEnforceEthnicConsistency(
  positivePrompt: string,
  negativePrompt?: string
): { positivePrompt: string; negativePrompt: string } {
  // Always enforce for safety (default to enforcement)
  // Even if keywords not detected, better to be safe
  return enforceEthnicConsistency(positivePrompt, negativePrompt);
}
