import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ResolutionKey } from "@shared/quickclip-utils";

interface QuickClipConfig {
  imageFile: File | null;
  image: string | null;
  imageUrl: string; // Direct URL input for testing
  useUrlInput: boolean; // Toggle between file upload and URL input
  animationPrompt: string;
  duration: number; // Duration in seconds (1.2 to 12 in 0.1s increments, default 5)
  enableMusic: boolean; // Auto-generate background music matching animation style
  resolutionKey: ResolutionKey; // Video resolution key
  numberOfVideos: number; // 1-4 videos to generate
}

type GenerationStatus = 'idle' | 'uploading' | 'generating' | 'polling' | 'complete' | 'error';

export function useQuickClipVideo(projectId: string) {
  const { toast } = useToast();
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [taskUUIDs, setTaskUUIDs] = useState<string[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [variation, setVariation] = useState<number>(0);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  
  const [config, setConfig] = useState<QuickClipConfig>({
    imageFile: null,
    image: null,
    imageUrl: "",
    useUrlInput: false,
    animationPrompt: "",
    duration: 5, // Default 5 seconds
    enableMusic: true, // Auto-music enabled by default
    resolutionKey: '3x4_720', // Default: 3:4 Portrait - 720p
    numberOfVideos: 1, // Default: 1 video
  });

  // Helper: Convert object storage path to full HTTPS URL
  const toFullUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path; // Already a full URL
    }
    // Convert relative path to full HTTPS URL
    const origin = window.location.origin;
    return `${origin}${path}`;
  };

  const generateAnimationPrompt = async (imageUrl: string, variationSeed: number = 0) => {
    try {
      setIsGeneratingPrompt(true);
      
      // Convert to full HTTPS URL if it's a relative path
      const fullImageUrl = toFullUrl(imageUrl);
      
      const response = await apiRequest<{ animationPrompt: string }>(
        "POST", 
        "/api/quickclip/generate-animation-prompt",
        { imageUrl: fullImageUrl, variation: variationSeed }
      );

      // Truncate to 200 characters max (UI limit)
      const truncatedPrompt = response.animationPrompt.slice(0, 200);
      
      setConfig(prev => ({ ...prev, animationPrompt: truncatedPrompt }));
      
      toast({
        title: "Animation prompt generated!",
        description: "AI has suggested an animation style for your video.",
      });
    } catch (error: any) {
      console.error('[QuickClip] Failed to generate animation prompt:', error);
      toast({
        title: "Failed to generate prompt",
        description: "Please enter a manual animation description.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const shuffleAnimationPrompt = async () => {
    const uploadedImageUrl = config.image;
    
    if (!uploadedImageUrl) {
      toast({
        title: "No image uploaded",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    // Upload current image to get URL for Gemini
    setIsGeneratingPrompt(true);
    
    try {
      // Upload image to object storage first
      const formData = new FormData();
      if (config.imageFile) {
        formData.append('images', config.imageFile);
      }
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const uploadResponse = await fetch('/api/upload/promo-scene-images', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.images[0]?.url;
      
      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      // Increment variation and generate new prompt
      const newVariation = variation + 1;
      setVariation(newVariation);
      await generateAnimationPrompt(imageUrl, newVariation);
    } catch (error: any) {
      console.error('[QuickClip] Shuffle failed:', error);
      toast({
        title: "Shuffle failed",
        description: "Could not generate a new animation prompt.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      setConfig(prev => ({
        ...prev,
        imageFile: file,
        image: event.target?.result as string,
      }));

      // Auto-generate animation prompt after upload
      try {
        setIsGeneratingPrompt(true);
        
        // Upload to object storage first
        const formData = new FormData();
        formData.append('images', file);
        
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const uploadResponse = await fetch('/api/upload/promo-scene-images', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.images[0]?.url;
        
        if (imageUrl) {
          // Generate animation prompt with variation 0 (first prompt)
          await generateAnimationPrompt(imageUrl, 0);
        }
      } catch (error) {
        console.error('[QuickClip] Auto-generate prompt failed:', error);
        // Don't show error toast, user can still manually enter prompt
      } finally {
        setIsGeneratingPrompt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setConfig(prev => ({
      ...prev,
      imageFile: null,
      image: null,
    }));
  };

  const setAnimationPrompt = (text: string) => {
    setConfig(prev => ({ ...prev, animationPrompt: text }));
  };

  const setDuration = (duration: number) => {
    // Clamp duration to valid range and round to nearest 0.1s
    const clampedDuration = Math.max(1.2, Math.min(12, duration));
    const roundedDuration = Math.round(clampedDuration * 10) / 10;
    setConfig(prev => ({ ...prev, duration: roundedDuration }));
  };

  const setEnableMusic = (enabled: boolean) => {
    setConfig(prev => ({ ...prev, enableMusic: enabled }));
  };

  // Mutation: Upload image + Start video generation
  const generateMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string;

      if (config.useUrlInput) {
        // Using URL input (test mode)
        if (!config.imageUrl || !config.imageUrl.trim()) {
          throw new Error("No image URL provided");
        }
        imageUrl = config.imageUrl.trim();
        setStatus('generating');
      } else {
        // Using file upload (normal mode)
        if (!config.imageFile) {
          throw new Error("No image file selected");
        }

        setStatus('uploading');
        
        // Step 1: Upload image to object storage
        const formData = new FormData();
        formData.append('images', config.imageFile);
        
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const uploadResponse = await fetch('/api/upload/promo-scene-images', {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.images[0]?.url;
        
        if (!imageUrl) {
          throw new Error('No image URL returned from upload');
        }

        setStatus('generating');
      }

      // Convert to full HTTPS URL
      const fullImageUrl = toFullUrl(imageUrl);

      // Step 2: Start video generation (with optional auto-music)
      const generateResponse = await apiRequest<{ 
        quickclipId: string;
        taskUUIDs: string[];
        message: string;
      }>("POST", "/api/quickclip/generate", {
        imageUrl: fullImageUrl,
        duration: config.duration,
        animationPrompt: config.animationPrompt,
        enableMusic: config.enableMusic, // Auto-detect and generate music
        resolutionKey: config.resolutionKey,
        numberOfVideos: config.numberOfVideos,
        projectId,
      });

      return generateResponse;
    },
    onSuccess: (response) => {
      console.log('[QuickClip] Video generation started:', response);
      console.log(`[QuickClip] Generated ${response.taskUUIDs.length} video task(s)`);
      
      // Store all taskUUIDs for multi-video polling
      setTaskUUIDs(response.taskUUIDs);
      setCompletedCount(0);
      setStatus('polling');
      
      // 🎯 FIX 2: Dispatch event to add placeholder video cards in UI
      window.dispatchEvent(new CustomEvent('quickclip-generation-started', {
        detail: { 
          projectId,
          taskUUIDs: response.taskUUIDs,
          numberOfVideos: config.numberOfVideos,
          animationPrompt: config.animationPrompt
        }
      }));
      console.log('[QuickClip] 🎬 Dispatched quickclip-generation-started event');
      
      toast({
        title: "Video generation started",
        description: response.message || `${response.taskUUIDs.length} video(s) being generated.`,
      });
    },
    onError: (error: Error) => {
      console.error('[QuickClip] Generation failed:', error);
      setStatus('error');
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate QuickClip video",
        variant: "destructive",
      });
    },
  });

  // Track last processed poll status to avoid duplicate toasts
  const lastProcessedStatusRef = useRef<string | null>(null);
  const pollStartTimeRef = useRef<number | null>(null);
  const pollCountRef = useRef<number>(0);
  
  const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes max
  const MAX_POLL_COUNT = 60; // 60 polls * 5 seconds = 5 minutes

  // Query: Poll for video generation status (all taskUUIDs)
  const pollQuery = useQuery({
    queryKey: ['/api/quickclip/status', taskUUIDs.join(',')],
    queryFn: async () => {
      if (taskUUIDs.length === 0) {
        console.log('[QuickClip Poll] No taskUUIDs, returning null');
        return null;
      }
      
      // Initialize poll timing on first poll
      if (!pollStartTimeRef.current) {
        pollStartTimeRef.current = Date.now();
        pollCountRef.current = 0;
      }
      
      pollCountRef.current += 1;
      const elapsedMs = Date.now() - pollStartTimeRef.current;
      
      console.log(`[QuickClip Poll] Fetching status for ${taskUUIDs.length} task(s) (poll #${pollCountRef.current}, elapsed: ${Math.round(elapsedMs / 1000)}s)`);
      
      // Check for timeout
      if (elapsedMs > MAX_POLL_DURATION_MS || pollCountRef.current > MAX_POLL_COUNT) {
        console.error('[QuickClip Poll] ⏱️ TIMEOUT - Video generation took too long');
        setStatus('error');
        lastProcessedStatusRef.current = 'failed';
        pollStartTimeRef.current = null;
        toast({
          title: "Generation timeout",
          description: "Video generation is taking longer than expected. Please try again later.",
          variant: "destructive",
        });
        return { status: 'failed' as const, completedCount: 0, totalCount: taskUUIDs.length, results: [] };
      }
      
      // Poll all taskUUIDs in parallel
      const statusPromises = taskUUIDs.map(async (uuid) => {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/quickclip/status/${uuid}`, {
          headers,
          credentials: 'include',
        });
        
        if (!response.ok) {
          return { uuid, status: 'failed' as const, error: 'Fetch failed' };
        }
        
        const data = await response.json() as {
          status: 'processing' | 'success' | 'failed';
          videoURL?: string;
          error?: string;
          cost?: number;
        };
        
        return { uuid, ...data };
      });
      
      const results = await Promise.all(statusPromises);
      
      // Count completed videos
      const successful = results.filter(r => r.status === 'success' && r.videoURL).length;
      const failed = results.filter(r => r.status === 'failed').length;
      const processing = results.filter(r => r.status === 'processing').length;
      
      console.log(`[QuickClip Poll] Status: ${successful} success, ${failed} failed, ${processing} processing`);
      
      // Update completed count
      setCompletedCount(successful);
      
      // Check if all videos are done (success or failed)
      if (successful + failed === taskUUIDs.length) {
        console.log(`[QuickClip Poll] ✅ ALL COMPLETE! ${successful} success, ${failed} failed`);
        lastProcessedStatusRef.current = 'success';
        pollStartTimeRef.current = null;
        
        // 🎯 FIX 1: Set status to 'complete' IMMEDIATELY to stop "Generating..." spinner
        setStatus('complete');
        console.log('[QuickClip Poll] 🛑 Status set to complete - spinner stopped');
        
        // 🎯 FIX 2C: Direct fetch + setQueryData to update cache (avoids query key mismatch)
        const { queryClient } = await import('@/lib/queryClient');
        
        try {
          // Fetch fresh visuals from API
          const token = localStorage.getItem('token');
          const headers: Record<string, string> = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const visualsResponse = await fetch(`/api/projects/${projectId}/visuals`, {
            headers,
            credentials: 'include'
          });
          
          if (visualsResponse.ok) {
            const visuals = await visualsResponse.json();
            console.log('[QuickClip Poll] ✅ Fetched', visuals.length, 'visuals from API');
            
            // Directly update cache with fetched data
            queryClient.setQueryData(['/api/projects', projectId, 'visuals'], visuals);
            console.log('[QuickClip Poll] 📝 Updated cache with setQueryData()');
            
            // 🔔 Dispatch 'visuals-updated' event for App.tsx placeholder replacement
            window.dispatchEvent(new CustomEvent('visuals-updated', {
              detail: { projectId, visuals }
            }));
            console.log('[QuickClip Poll] 🔔 Dispatched visuals-updated event with', visuals.length, 'visuals');
          } else {
            console.error('[QuickClip Poll] ❌ Failed to fetch visuals:', visualsResponse.status);
            // Fallback: invalidate to trigger background refetch
            await queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'visuals'] });
          }
        } catch (error) {
          console.error('[QuickClip Poll] ❌ Error fetching visuals:', error);
          // Fallback: invalidate to trigger background refetch
          await queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'visuals'] });
        }
        
        if (successful > 0) {
          // At least some videos succeeded
          const message = failed > 0 
            ? `${successful} video(s) ready, ${failed} failed.`
            : `All ${successful} video(s) generated successfully!`;
          
          toast({
            title: `${successful} video(s) ready!`,
            description: message,
            variant: failed > 0 ? "default" : "default",
          });
          
          return { status: 'success' as const, completedCount: successful, totalCount: taskUUIDs.length, results };
        } else {
          // All videos failed
          console.error('[QuickClip Poll] ❌ ALL FAILED!');
          setStatus('error');
          
          toast({
            title: "All videos failed",
            description: "All video generations failed. Please try again.",
            variant: "destructive",
          });
          
          return { status: 'failed' as const, completedCount: 0, totalCount: taskUUIDs.length, results };
        }
      }

      return { status: 'processing' as const, completedCount: successful, totalCount: taskUUIDs.length, results };
    },
    enabled: taskUUIDs.length > 0 && (status === 'polling' || status === 'generating'),
    refetchInterval: (query) => {
      const data = query.state.data;
      
      console.log('[QuickClip Poll] RefetchInterval check:', {
        hasData: !!data,
        dataStatus: data?.status,
        completedCount: data?.completedCount || 0,
        totalCount: data?.totalCount || 0,
        currentStatus: status,
      });
      
      // Stop polling when query data shows terminal state
      const shouldStop = !data || 
                        data.status === 'success' || 
                        data.status === 'failed' ||
                        status === 'complete' || 
                        status === 'error';
      
      if (shouldStop) {
        console.log('[QuickClip Poll] Stopping poll - terminal state reached');
        pollStartTimeRef.current = null;
        return false;
      }
      
      // Poll every 5 seconds while processing
      console.log('[QuickClip Poll] Continuing poll in 5 seconds...');
      return 5000;
    },
  });

  // Log poll query state changes
  useEffect(() => {
    console.log('[QuickClip Poll State]', {
      status,
      taskUUIDs,
      completedCount,
      queryEnabled: pollQuery.isSuccess || pollQuery.isError || pollQuery.isFetching,
      queryData: pollQuery.data,
      videoUrl,
    });
  }, [status, taskUUIDs, completedCount, pollQuery.data, pollQuery.isSuccess, pollQuery.isError, pollQuery.isFetching, videoUrl]);

  const triggerGeneration = async () => {
    // Validate based on input mode
    let hasImage = false;
    
    if (config.useUrlInput) {
      // Validate URL format before proceeding
      hasImage = validateImageUrl(config.imageUrl);
    } else {
      hasImage = !!config.imageFile;
    }
    
    if (!hasImage || !config.animationPrompt.trim()) {
      toast({
        title: "Missing required fields",
        description: config.useUrlInput 
          ? "Please enter a valid HTTPS image URL and animation prompt."
          : "Please upload an image and enter an animation prompt.",
        variant: "destructive",
      });
      return;
    }

    // Reset state for new generation
    setStatus('idle');
    setTaskUUIDs([]);
    setCompletedCount(0);
    setVideoUrl(null);
    lastProcessedStatusRef.current = null; // Reset processing tracker
    pollStartTimeRef.current = null; // Reset poll timer
    
    // Trigger the mutation
    generateMutation.mutate();
  };

  const setImageUrl = (url: string) => {
    // Allow incremental typing - just store the URL
    // Validation will happen when user attempts to generate
    setConfig(prev => ({ ...prev, imageUrl: url }));
  };

  const validateImageUrl = (url: string): boolean => {
    const trimmedUrl = url.trim();
    
    // Only allow HTTPS URLs for security
    if (trimmedUrl && !trimmedUrl.startsWith('https://')) {
      toast({
        title: "Invalid URL",
        description: "Only HTTPS URLs are allowed for security reasons.",
        variant: "destructive",
      });
      return false;
    }
    
    return !!trimmedUrl;
  };

  const setUseUrlInput = (use: boolean) => {
    setConfig(prev => ({ ...prev, useUrlInput: use }));
  };

  const setResolutionKey = (key: ResolutionKey) => {
    setConfig(prev => ({ ...prev, resolutionKey: key }));
  };

  const setNumberOfVideos = (count: number) => {
    setConfig(prev => ({ ...prev, numberOfVideos: Math.max(1, Math.min(4, count)) }));
  };

  return {
    image: config.image,
    imageFile: config.imageFile,
    imageUrl: config.imageUrl,
    useUrlInput: config.useUrlInput,
    animationPrompt: config.animationPrompt,
    duration: config.duration,
    enableMusic: config.enableMusic,
    resolutionKey: config.resolutionKey,
    numberOfVideos: config.numberOfVideos,
    status,
    videoUrl,
    isGenerating: generateMutation.isPending || status === 'uploading' || status === 'generating' || status === 'polling',
    isGeneratingPrompt,
    setAnimationPrompt,
    setDuration,
    setEnableMusic,
    setImageUrl,
    setUseUrlInput,
    setResolutionKey,
    setNumberOfVideos,
    handleImageUpload,
    removeImage,
    shuffleAnimationPrompt,
    triggerGeneration,
  };
}
