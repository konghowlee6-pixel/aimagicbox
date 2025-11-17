import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

// TTS Service for generating voiceovers using Google Cloud Text-to-Speech
export class TTSService {
  private client: TextToSpeechClient | null = null;

  constructor() {
    try {
      // Initialize Google Cloud TTS client if credentials are available
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID) {
        this.client = new TextToSpeechClient();
        console.log('[TTS] Google Cloud TTS initialized successfully');
      } else {
        console.warn('[TTS] Google Cloud TTS credentials not found. TTS features will be limited.');
      }
    } catch (error) {
      console.error('[TTS] Failed to initialize Google Cloud TTS:', error);
    }
  }

  /**
   * Generate voiceover audio from text using Google Cloud TTS
   * @param text - Text to convert to speech
   * @param language - Language code ('en' or 'zh')
   * @param voiceType - Voice gender ('male' or 'female')
   * @param outputPath - Output file path for the generated audio
   * @returns Path to the generated audio file
   */
  async generateVoiceover(
    text: string,
    language: 'en' | 'zh',
    voiceType: 'male' | 'female',
    outputPath?: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Google Cloud TTS is not initialized. Please configure GOOGLE_APPLICATION_CREDENTIALS.');
    }

    // Map language and voice type to Google Cloud TTS voice names
    const voiceMapping = {
      'en-male': { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE' as const },
      'en-female': { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' as const },
      'zh-male': { languageCode: 'zh-CN', name: 'zh-CN-Wavenet-B', ssmlGender: 'MALE' as const },
      'zh-female': { languageCode: 'zh-CN', name: 'zh-CN-Wavenet-A', ssmlGender: 'FEMALE' as const },
    };

    const voiceKey = `${language}-${voiceType}` as keyof typeof voiceMapping;
    const voiceConfig = voiceMapping[voiceKey];

    if (!voiceConfig) {
      throw new Error(`Unsupported language/voice combination: ${language}-${voiceType}`);
    }

    // Construct the request
    const request = {
      input: { text },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceConfig.name,
        ssmlGender: voiceConfig.ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    };

    console.log(`[TTS] Generating voiceover: ${language}-${voiceType}, text length: ${text.length}`);

    // Perform the text-to-speech request
    const [response] = await this.client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error('No audio content received from Google Cloud TTS');
    }

    // Generate output path if not provided
    const finalPath = outputPath || path.join(
      process.cwd(),
      'uploads',
      `voiceover-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`
    );

    // Ensure uploads directory exists
    await fs.mkdir(path.dirname(finalPath), { recursive: true });

    // Write the binary audio content to a local file
    await fs.writeFile(finalPath, response.audioContent, 'binary');

    console.log(`[TTS] Voiceover generated successfully: ${finalPath}`);
    return finalPath;
  }

  /**
   * Generate multiple voiceovers for different scenes
   * @param sceneDescriptions - Array of text descriptions for each scene
   * @param language - Language code
   * @param voiceType - Voice gender
   * @returns Array of file paths to generated audio files
   */
  async generateMultipleVoiceovers(
    sceneDescriptions: string[],
    language: 'en' | 'zh',
    voiceType: 'male' | 'female'
  ): Promise<string[]> {
    console.log(`[TTS] Generating ${sceneDescriptions.length} voiceovers`);
    
    const promises = sceneDescriptions.map((text, index) =>
      this.generateVoiceover(
        text,
        language,
        voiceType,
        path.join(process.cwd(), 'uploads', `voiceover-scene-${index}-${Date.now()}.mp3`)
      )
    );

    return Promise.all(promises);
  }

  /**
   * Validate if TTS service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get estimated cost for TTS generation
   * @param textLength - Total character count
   * @returns Estimated cost in USD
   */
  getEstimatedCost(textLength: number): number {
    // Google Cloud TTS Neural2 voices pricing: $16 per 1 million characters
    const costPerMillionChars = 16;
    return (textLength / 1_000_000) * costPerMillionChars;
  }
}

// Export singleton instance
export const ttsService = new TTSService();
