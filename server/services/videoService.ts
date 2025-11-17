import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

// Music style to file mapping (predefined background music tracks)
const MUSIC_STYLES: Record<string, string> = {
  calm: 'assets/music/calm.mp3',
  modern: 'assets/music/modern.mp3',
  corporate: 'assets/music/corporate.mp3',
  soft: 'assets/music/soft.mp3',
  energetic: 'assets/music/energetic.mp3',
};

export interface VideoScene {
  imagePath: string;
  description: string;
  duration: number; // seconds
}

export interface VideoGenerationConfig {
  scenes: VideoScene[];
  voiceoverPath?: string; // Optional custom voiceover
  musicStyle: 'calm' | 'modern' | 'corporate' | 'soft' | 'energetic';
  outputPath: string;
  resolution?: '720p' | '1080p';
}

/**
 * Video Generation Service using FFmpeg
 * Creates promotional videos by combining images, voiceover, and background music
 */
export class VideoService {
  private readonly defaultResolution = '1080p';
  private readonly defaultSceneDuration = 5; // seconds per scene

  /**
   * Generate a promotional video from scenes, voiceover, and background music
   */
  async generatePromoVideo(config: VideoGenerationConfig): Promise<string> {
    const {
      scenes,
      voiceoverPath,
      musicStyle,
      outputPath,
      resolution = this.defaultResolution,
    } = config;

    console.log(`[VideoService] Generating promo video with ${scenes.length} scenes`);
    console.log(`[VideoService] Resolution: ${resolution}, Music style: ${musicStyle}`);

    // Validate inputs
    if (scenes.length === 0) {
      throw new Error('At least one scene is required');
    }

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Step 1: Create video from image scenes with transitions
    const videoWithoutAudioPath = outputPath.replace('.mp4', '_no_audio.mp4');
    await this.createVideoFromScenes(scenes, videoWithoutAudioPath, resolution);

    // Step 2: Add audio layers (voiceover + background music)
    await this.addAudioToVideo(
      videoWithoutAudioPath,
      voiceoverPath,
      musicStyle,
      outputPath
    );

    // Step 3: Clean up temporary file
    try {
      await fs.unlink(videoWithoutAudioPath);
    } catch (error) {
      console.warn('[VideoService] Failed to clean up temporary file:', error);
    }

    console.log(`[VideoService] Video generation completed: ${outputPath}`);
    return outputPath;
  }

  /**
   * Create video from image scenes with fade transitions
   */
  private async createVideoFromScenes(
    scenes: VideoScene[],
    outputPath: string,
    resolution: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const resolutionMap = {
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
      };

      const { width, height } = resolutionMap[resolution as keyof typeof resolutionMap];
      const transitionDuration = 0.5; // seconds

      // Create filter complex for scene composition with fade transitions
      const filterComplex: string[] = [];
      const inputOptions: string[] = [];

      // Add each scene as an input
      scenes.forEach((scene, index) => {
        inputOptions.push('-loop', '1', '-t', scene.duration.toString(), '-i', scene.imagePath);

        // Scale and pad each image to fit the target resolution
        filterComplex.push(
          `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,` +
          `setsar=1,fps=30,format=yuv420p[v${index}]`
        );
      });

      // Create fade transitions between scenes
      let previousLabel = 'v0';
      for (let i = 1; i < scenes.length; i++) {
        const currentLabel = `v${i}`;
        const outputLabel = i === scenes.length - 1 ? 'vout' : `v${i}tmp`;

        // Calculate offset for fade transition
        const offset = scenes.slice(0, i).reduce((sum, s) => sum + s.duration, 0) - transitionDuration;

        filterComplex.push(
          `[${previousLabel}][${currentLabel}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outputLabel}]`
        );

        previousLabel = outputLabel;
      }

      const finalFilterComplex = filterComplex.join(';');

      console.log(`[VideoService] Creating video with ${scenes.length} scenes, resolution ${width}x${height}`);

      // Build FFmpeg command
      const command = ffmpeg();

      // Add all inputs
      scenes.forEach((scene) => {
        command.input(scene.imagePath).inputOptions(['-loop', '1', '-t', scene.duration.toString()]);
      });

      command
        .complexFilter(finalFilterComplex, scenes.length > 1 ? 'vout' : 'v0')
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[VideoService] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[VideoService] Processing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[VideoService] Video scenes compiled successfully');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('[VideoService] FFmpeg error:', err.message);
          console.error('[VideoService] FFmpeg stderr:', stderr);
          reject(new Error(`Video generation failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Add voiceover and background music to video
   */
  private async addAudioToVideo(
    videoPath: string,
    voiceoverPath: string | undefined,
    musicStyle: string,
    outputPath: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const musicPath = MUSIC_STYLES[musicStyle];

      // Check if music file exists
      let hasMusicFile = false;
      try {
        await fs.access(musicPath);
        hasMusicFile = true;
      } catch {
        console.warn(`[VideoService] Music file not found: ${musicPath}, continuing without background music`);
      }

      const command = ffmpeg(videoPath);

      // Build filter complex based on available audio sources
      let filterComplex: string;
      let audioMap: string;

      if (voiceoverPath && hasMusicFile) {
        // Both voiceover and music
        command
          .input(voiceoverPath)
          .input(musicPath);

        // Mix voiceover (at full volume) with background music (at reduced volume)
        filterComplex = '[1:a]volume=1.0[voice];[2:a]volume=0.3[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]';
        audioMap = '[aout]';
      } else if (voiceoverPath) {
        // Only voiceover
        command.input(voiceoverPath);
        filterComplex = '[1:a]volume=1.0[aout]';
        audioMap = '[aout]';
      } else if (hasMusicFile) {
        // Only background music
        command.input(musicPath);
        filterComplex = '[1:a]volume=0.5[aout]';
        audioMap = '[aout]';
      } else {
        // No audio - generate silent audio using lavfi
        command
          .input('anullsrc=channel_layout=stereo:sample_rate=44100')
          .inputFormat('lavfi');
        filterComplex = '[1:a]anull[aout]';
        audioMap = '[aout]';
      }

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '0:v',
          '-map', audioMap,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[VideoService] Adding audio - FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[VideoService] Audio mixing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[VideoService] Audio added successfully');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('[VideoService] Audio mixing error:', err.message);
          console.error('[VideoService] FFmpeg stderr:', stderr);
          reject(new Error(`Audio mixing failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Get video information (duration, resolution, etc.)
   */
  async getVideoInfo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Calculate estimated generation time based on scene count
   * @param sceneCount - Number of scenes
   * @returns Estimated time in seconds
   */
  getEstimatedGenerationTime(sceneCount: number): number {
    // Rough estimate: 10 seconds per scene + base overhead
    return sceneCount * 10 + 30;
  }

  /**
   * Combine video with background music for QuickClip
   */
  async combineVideoWithMusic(
    videoUrl: string,
    audioUrl: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[VideoService] Combining video with music...');
      console.log('[VideoService] Video URL:', videoUrl);
      console.log('[VideoService] Audio URL:', audioUrl);
      console.log('[VideoService] Output path:', outputPath);

      ffmpeg()
        .input(videoUrl)
        .input(audioUrl)
        .outputOptions([
          '-map', '0:v',
          '-map', '1:a',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[VideoService] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[VideoService] Music mixing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[VideoService] Video + music combined successfully');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('[VideoService] FFmpeg error:', err.message);
          console.error('[VideoService] FFmpeg stderr:', stderr);
          reject(new Error(`Video + music combination failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Concatenate multiple video files with crossfade transitions
   * This is specifically for PromoVideo multi-scene stitching
   */
  async concatenateVideosWithTransitions(
    videoPaths: string[],
    outputPath: string,
    transitionDuration: number = 0.5
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (videoPaths.length === 0) {
        return reject(new Error('No video files provided'));
      }

      console.log(`[VideoService] Concatenating ${videoPaths.length} videos with transitions...`);
      console.log(`[VideoService] Transition duration: ${transitionDuration}s`);

      try {
        // If only one video, just copy it
        if (videoPaths.length === 1) {
          const copyCommand = ffmpeg(videoPaths[0])
            .outputOptions([
              '-c', 'copy',
              '-movflags', '+faststart'
            ])
            .output(outputPath);

          copyCommand
            .on('start', (cmd) => console.log('[VideoService] Copy command:', cmd))
            .on('end', () => {
              console.log('[VideoService] Single video copied successfully');
              resolve();
            })
            .on('error', (err) => {
              console.error('[VideoService] Copy error:', err.message);
              reject(new Error(`Video copy failed: ${err.message}`));
            })
            .run();
          return;
        }

        // For multiple videos, get duration of each video first
        const videoDurations: number[] = [];
        for (const videoPath of videoPaths) {
          const metadata = await this.getVideoInfo(videoPath);
          const duration = Number(metadata.format.duration ?? 0);
          
          // Guard against invalid durations
          if (isNaN(duration) || duration <= 0) {
            console.warn(`[VideoService] Invalid duration for ${videoPath}, using 5s default`);
            videoDurations.push(5.0); // Default fallback
          } else {
            videoDurations.push(duration);
            console.log(`[VideoService] Video ${videoPath}: ${duration}s`);
          }
        }

        // Build complex filter for crossfade transitions
        const filterComplex: string[] = [];
        let previousLabel = '0:v';

        for (let i = 1; i < videoPaths.length; i++) {
          const rawOffset = videoDurations.slice(0, i).reduce((sum, d) => sum + d, 0) - (i * transitionDuration);
          const offset = Math.max(rawOffset, 0); // Clamp to ≥0 to handle short clips
          const outputLabel = i === videoPaths.length - 1 ? 'vout' : `v${i}`;
          
          console.log(`[VideoService] Transition ${i}: offset=${offset}s (raw: ${rawOffset}s)`);
          
          filterComplex.push(
            `[${previousLabel}][${i}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outputLabel}]`
          );
          
          previousLabel = outputLabel;
        }

        console.log(`[VideoService] Filter complex: ${filterComplex.join(';')}`);

        // Build FFmpeg command
        const command = ffmpeg();
        
        // Add all video inputs
        videoPaths.forEach((videoPath) => {
          command.input(videoPath);
        });

        command
          .complexFilter(filterComplex, 'vout')
          .outputOptions([
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart'
          ])
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('[VideoService] Concatenation FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`[VideoService] Concatenation: ${progress.percent.toFixed(1)}%`);
            }
          })
          .on('end', () => {
            console.log('[VideoService] Videos concatenated successfully');
            resolve();
          })
          .on('error', (err, stdout, stderr) => {
            console.error('[VideoService] Concatenation error:', err.message);
            console.error('[VideoService] FFmpeg stderr:', stderr);
            reject(new Error(`Video concatenation failed: ${err.message}`));
          })
          .run();
      } catch (error: any) {
        console.error('[VideoService] Concatenation preparation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Add audio (voiceover and/or background music) to a video file
   * Used for PromoVideo final processing
   */
  async addAudioTracksToVideo(
    videoPath: string,
    audioPath: string | null,
    musicPath: string | null,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[VideoService] Adding audio tracks to video...');
      console.log('[VideoService] Video:', videoPath);
      console.log('[VideoService] Audio:', audioPath || 'none');
      console.log('[VideoService] Music:', musicPath || 'none');

      const command = ffmpeg(videoPath);

      if (!audioPath && !musicPath) {
        console.log('[VideoService] No audio tracks - copying video as-is');
        command
          .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
          .output(outputPath)
          .on('start', (cmd) => console.log('[VideoService] Copy command:', cmd))
          .on('end', () => {
            console.log('[VideoService] Video copied successfully');
            resolve();
          })
          .on('error', (err) => {
            console.error('[VideoService] Copy error:', err.message);
            reject(new Error(`Video copy failed: ${err.message}`));
          })
          .run();
        return;
      }

      // Build filter complex for mixing audio
      let filterComplex: string;
      let audioMap: string;

      if (audioPath && musicPath) {
        command.input(audioPath).input(musicPath);
        filterComplex = '[1:a]volume=1.0[voice];[2:a]volume=0.3[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]';
        audioMap = '[aout]';
      } else if (audioPath) {
        command.input(audioPath);
        filterComplex = '[1:a]volume=1.0[aout]';
        audioMap = '[aout]';
      } else {
        command.input(musicPath!);
        filterComplex = '[1:a]volume=0.5[aout]';
        audioMap = '[aout]';
      }

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '0:v',
          '-map', audioMap,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[VideoService] Audio mixing command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[VideoService] Audio mixing: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[VideoService] Audio tracks added successfully');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('[VideoService] Audio mixing error:', err.message);
          console.error('[VideoService] FFmpeg stderr:', stderr);
          reject(new Error(`Audio mixing failed: ${err.message}`));
        })
        .run();
    });
  }
}

// Export singleton instance
export const videoService = new VideoService();
