import { useState, useEffect } from "react";
import { useQuery, useMutation, type QueryObserverResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PromoVideo } from "@shared/schema";
import type { ResolutionKey } from "@shared/quickclip-utils";

interface PromoVideoConfig {
  uploadedImages: string[]; // Object URLs for preview
  uploadedImageFiles: File[]; // Actual File objects for upload
  imageDimensions: { width: number; height: number }[]; // Dimensions of each uploaded image
  sceneIds: string[]; // Stable unique IDs for each scene (for drag-and-drop)
  alignmentMode: "stretch" | "letterbox" | "crop"; // How to handle dimension mismatches
  sceneCount: 3 | 4 | 5;
  sceneDescriptions: string[];
  aiSceneSuggestions: string[]; // AI-generated suggestions (stored separately)
  sceneTextOverlays: string[]; // Marketing text overlays for each scene
  aiTextOverlaySuggestions: string[]; // AI-generated text overlay suggestions
  voiceLanguage: "ms" | "en" | "zh";
  voiceType: "male" | "female";
  customVoiceoverFile: File | null;
  musicStyle: "calm" | "modern" | "corporate" | "soft" | "energetic";
  totalDuration: 15 | 30 | 60; // Total video duration in seconds
  durationMode: "auto" | "manual";
  enableNarrationSummary: boolean; // Toggle for optional narration summary at end of video
  narrationSummaryText: string; // Cached narration text for preview/editing
  videoResolution: ResolutionKey; // Video output resolution
}

// Helper to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function usePromoVideo(projectId: string) {
  const { toast } = useToast();
  const [config, setConfig] = useState<PromoVideoConfig>({
    uploadedImages: [],
    uploadedImageFiles: [],
    imageDimensions: [],
    sceneIds: [], // Initialize with empty array, will be populated when images are uploaded
    alignmentMode: "letterbox",
    sceneCount: 3,
    sceneDescriptions: ["", "", ""],
    aiSceneSuggestions: ["", "", ""],
    sceneTextOverlays: ["", "", ""],
    aiTextOverlaySuggestions: ["", "", ""],
    voiceLanguage: "ms",
    voiceType: "male",
    customVoiceoverFile: null,
    musicStyle: "calm",
    durationMode: "auto",
    totalDuration: 15, // Default to 15s
    enableNarrationSummary: false, // Disabled by default
    narrationSummaryText: "", // Empty until generated
    videoResolution: '3x4_720', // Default: 3:4 Portrait - 720p
  });
  const [currentPromoVideoId, setCurrentPromoVideoId] = useState<string | null>(null);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [lastRequestSignature, setLastRequestSignature] = useState<string | null>(null);

  // Helper function to set total duration
  const setTotalDuration = (duration: 15 | 30 | 60 | "auto") => {
    setConfig(prev => {
      if (duration === "auto") {
        const autoDuration = prev.sceneCount === 5 ? 30 : 15;
        return {
          ...prev,
          durationMode: "auto",
          totalDuration: autoDuration,
        };
      }

      return {
        ...prev,
        durationMode: "manual",
        totalDuration: duration,
      };
    });
  };

  // Effect to update scene descriptions and text overlays when scene count changes
  useEffect(() => {
    setConfig(prev => {
      // Generate new IDs for any new scenes (if scene count increased)
      const newSceneIds = Array(config.sceneCount).fill("").map((_, i) => 
        prev.sceneIds?.[i] || `scene-${Date.now()}-${i}`
      );
      
      return {
        ...prev,
        sceneIds: newSceneIds,
        sceneDescriptions: Array(config.sceneCount).fill("").map((_, i) => prev.sceneDescriptions[i] || ""),
        aiSceneSuggestions: Array(config.sceneCount).fill("").map((_, i) => prev.aiSceneSuggestions?.[i] || ""),
        sceneTextOverlays: Array(config.sceneCount).fill("").map((_, i) => prev.sceneTextOverlays?.[i] || ""),
        aiTextOverlaySuggestions: Array(config.sceneCount).fill("").map((_, i) => prev.aiTextOverlaySuggestions?.[i] || ""),
      };
    });
  }, [config.sceneCount]);

  // Effect to auto-adjust duration based on scene count (only when in auto mode)
  useEffect(() => {
    if (config.durationMode === "auto") {
      const targetDuration = config.sceneCount === 5 ? 30 : 15;
      if (config.totalDuration !== targetDuration) {
        setConfig(prev => ({ ...prev, totalDuration: targetDuration }));
      }
    }
  }, [config.sceneCount, config.durationMode, config.totalDuration]);

  // Generate scene descriptions using AI
  const generateSceneDescriptions = async (files: File[]) => {
    // Create request signature to avoid duplicate calls (include lastModified for precision)
    const signature = files.map(f => `${f.name}-${f.size}-${f.lastModified}`).join('|');
    if (signature === lastRequestSignature) {
      console.log('Skipping duplicate scene description request');
      return;
    }

    setIsGeneratingScenes(true);
    setLastRequestSignature(signature);

    try {
      // Convert files to base64
      console.log(`🎬 Converting ${files.length} images to base64...`);
      const base64Images = await Promise.all(files.map(fileToBase64));

      // Call API to generate descriptions
      console.log('🎬 Calling API to generate scene descriptions...');
      const response = await fetch('/api/generate/scene-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ images: base64Images }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate descriptions');
      }

      const data = await response.json();
      console.log('✅ Scene descriptions generated:', data);

      // Store AI suggestions separately
      setConfig(prev => {
        const newConfig = { ...prev, aiSceneSuggestions: data.descriptions };
        
        // Smart overwrite: only fill empty description slots
        const hasAllEmptyDescriptions = prev.sceneDescriptions.every(desc => !desc.trim());
        const hasSomeEmptyDescriptions = prev.sceneDescriptions.some(desc => !desc.trim());
        
        if (hasAllEmptyDescriptions) {
          // All empty - fill them all
          newConfig.sceneDescriptions = data.descriptions;
          toast({
            title: "Scene descriptions generated",
            description: `AI generated ${data.descriptions.length} scene descriptions.`,
          });
        } else if (hasSomeEmptyDescriptions) {
          // Some empty - fill only empty ones
          newConfig.sceneDescriptions = prev.sceneDescriptions.map((desc, i) => 
            desc.trim() ? desc : data.descriptions[i]
          );
          toast({
            title: "Empty scenes filled",
            description: "AI filled empty scene descriptions. Your existing text was preserved.",
          });
        } else {
          // All filled - show info toast with option to use suggestions
          toast({
            title: "Suggestions ready",
            description: "AI generated new descriptions. Your existing text was preserved. Use the suggestion buttons to apply them.",
          });
        }
        
        return newConfig;
      });

      // Show warning if any scenes failed
      const failedCount = data.results.filter((r: any) => !r.success).length;
      if (failedCount > 0) {
        toast({
          title: "Partial generation",
          description: `${failedCount} scene(s) used fallback text. You can edit them manually.`,
          variant: "destructive",
        });
      }

      // Note: Text overlays are now generated on-demand when user clicks "Add Marketing Text Overlay"

      // After text overlays, generate voiceover and music recommendations
      console.log('🎵 Generating voiceover and music recommendations...');
      try {
        const recommendationsResponse = await fetch('/api/generate/promo-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sceneDescriptions: data.descriptions }),
        });

        if (recommendationsResponse.ok) {
          const recommendationsData = await recommendationsResponse.json();
          console.log('✅ Recommendations generated:', recommendationsData);

          if (recommendationsData.success && recommendationsData.recommendations) {
            const { language, voiceType, musicStyle } = recommendationsData.recommendations;
            
            // Map API language format to UI format
            const languageMap: Record<string, "ms" | "en" | "zh"> = {
              'bahasa': 'ms',
              'english': 'en',
              'chinese': 'zh'
            };

            setConfig(prev => ({
              ...prev,
              voiceLanguage: languageMap[language] || 'ms',
              voiceType: voiceType,
              musicStyle: musicStyle,
            }));

            toast({
              title: "AI recommendations applied",
              description: "Voiceover and music settings have been auto-selected based on your scenes.",
            });
          }
        }
      } catch (recError) {
        console.error('Failed to generate recommendations (non-critical):', recError);
        // Don't show error toast - this is a nice-to-have feature
      }

    } catch (error: any) {
      console.error('Failed to generate scene descriptions:', error);
      // Reset signature on failure to allow retry
      setLastRequestSignature(null);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate scene descriptions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  // Query for promo videos list
  const { data: promoVideos, isLoading: isLoadingList } = useQuery<PromoVideo[]>({
    queryKey: ["/api/projects", projectId, "promo-videos"],
    enabled: !!projectId,
  });

  // Query for current promo video details (for status polling)
  const { data: currentPromoVideo, isLoading: isLoadingCurrent } = useQuery<PromoVideo>({
    queryKey: ["/api/promo-videos", currentPromoVideoId],
    enabled: !!currentPromoVideoId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if generating
      const video = query.state.data as PromoVideo | undefined;
      
      // 🎯 Auto-save and update visuals when generation completes
      if (video?.status === 'completed' && video.videoUrl) {
        // Fetch latest visuals to update cache (matches QuickClip pattern)
        apiRequest("GET", `/api/projects/${projectId}/visuals`).then((visuals) => {
          queryClient.setQueryData(['/api/projects', projectId, 'visuals'], visuals);
          
          // Dispatch event to update Generated Visuals panel
          window.dispatchEvent(new CustomEvent('visuals-updated', {
            detail: { projectId, visuals }
          }));
          console.log('[PromoVideo] 🔔 Dispatched visuals-updated event with', visuals.length, 'visuals');
        }).catch((error) => {
          console.error('[PromoVideo] ❌ Error fetching visuals:', error);
          // Fallback: invalidate to trigger background refetch
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'visuals'] });
        });
        
        // Stop polling
        return false;
      }
      
      return video?.status === 'generating' ? 2000 : false;
    },
  });

  // Mutation to create promo video draft
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Upload custom images (now always required)
      let sceneImageUrls: Record<number, string> = {};
      if (config.uploadedImageFiles.length > 0) {
        const formData = new FormData();
        config.uploadedImageFiles.forEach((file, index) => {
          formData.append('images', file);
        });
        
        const uploadResponse = await fetch('/api/upload/promo-scene-images', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Failed to upload images');
        }

        const uploadData = await uploadResponse.json();
        // Map sceneIndex to URL
        uploadData.images.forEach((img: {sceneIndex: number, url: string}) => {
          sceneImageUrls[img.sceneIndex] = img.url;
        });
      }

      // Step 2: Build scenes payload with imageUrl and alignment mode
      const scenes = config.sceneDescriptions.map((description, index) => ({
        sceneIndex: index,
        description,
        imageUrl: sceneImageUrls[index] || null,
      }));

      // Step 3: Create draft with enriched scenes and alignment mode
      const payload: any = {
        projectId,
        sceneCount: config.sceneCount,
        scenes,
        language: config.voiceLanguage,
        voiceType: config.voiceType,
        musicStyle: config.musicStyle,
        alignmentMode: config.alignmentMode,
      };
      
      // Only include totalDuration if in manual mode
      if (config.durationMode === "manual") {
        payload.totalDuration = config.totalDuration;
      }
      
      const response = await apiRequest("POST", "/api/promo-videos", payload);
      // Backend returns { promoVideo, scenes, message }, extract promoVideo
      return response.promoVideo;
    },
    onSuccess: (data) => {
      setCurrentPromoVideoId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "promo-videos"] });
      toast({
        title: "Draft created",
        description: "Promo video configuration saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create promo video draft.",
        variant: "destructive",
      });
    },
  });

  // Mutation to upload custom voiceover
  const uploadVoiceoverMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("voiceover", file);
      
      const response = await fetch("/api/upload/voiceover", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Voiceover uploaded",
        description: "Custom voiceover file uploaded successfully.",
      });
      return data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload voiceover.",
        variant: "destructive",
      });
    },
  });

  // Mutation to generate promo video
  const generateVideoMutation = useMutation({
    mutationFn: async (promoVideoId: string) => {
      return await apiRequest("POST", `/api/promo-videos/${promoVideoId}/generate`, {});
    },
    onSuccess: () => {
      toast({
        title: "Generation started",
        description: "Your promotional video is being generated. This may take a few minutes.",
      });
      
      // 🎯 Dispatch event to create placeholder in Generated Visuals (matches QuickClip pattern)
      window.dispatchEvent(new CustomEvent('promovideo-generation-started', {
        detail: { 
          projectId,
          promoVideoId: currentPromoVideoId,
          sceneCount: config.sceneCount,
          videoResolution: config.videoResolution,
        }
      }));
      console.log('[PromoVideo] 🎬 Dispatched promovideo-generation-started event');
      
      queryClient.invalidateQueries({ queryKey: ["/api/promo-videos", currentPromoVideoId] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to start video generation.",
        variant: "destructive",
      });
    },
  });

  // Helper to ensure narration summary is generated when needed
  const ensureNarrationSummary = async (draftId: string): Promise<string> => {
    if (!config.enableNarrationSummary) {
      return ""; // Narration disabled, return empty
    }

    // Check if we can reuse cached narration
    const currentSignature = `${config.voiceLanguage}-${config.sceneDescriptions.join('|')}`;
    const cachedNarration = config.narrationSummaryText.trim();
    
    // Reuse cached if available and not stale
    if (cachedNarration && lastRequestSignature === currentSignature) {
      console.log('🎙️ Reusing cached narration summary');
      return cachedNarration;
    }

    // Generate new narration
    setIsGeneratingNarration(true);
    try {
      console.log(`🎙️ Generating narration summary in ${config.voiceLanguage}...`);
      const response = await fetch('/api/generate/narration-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sceneDescriptions: config.sceneDescriptions,
          language: config.voiceLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate narration summary');
      }

      const data = await response.json();
      const narrationText = data.narrationText.trim();
      
      // Cache the generated narration
      setConfig(prev => ({ ...prev, narrationSummaryText: narrationText }));
      setLastRequestSignature(currentSignature);

      // Persist to draft
      await apiRequest("PATCH", `/api/promo-videos/${draftId}`, {
        narrationSummaryText: narrationText,
      });

      toast({
        title: "Narration generated",
        description: "AI narration summary has been added to your video.",
      });

      console.log(`✅ Narration summary generated: "${narrationText.substring(0, 100)}..."`);
      return narrationText;
    } catch (error: any) {
      console.error("Narration generation failed:", error);
      toast({
        title: "Narration generation failed",
        description: "Continuing with video generation without narration.",
        variant: "destructive",
      });
      // Non-blocking: return empty string and continue
      return "";
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  // High-level methods
  const createDraft = () => createDraftMutation.mutate();
  
  const uploadVoiceover = async (file: File) => {
    const result = await uploadVoiceoverMutation.mutateAsync(file);
    return result;
  };

  const triggerGeneration = async () => {
    let draftId: string;
    
    if (!currentPromoVideoId) {
      // Create draft first
      const draft = await createDraftMutation.mutateAsync();
      setCurrentPromoVideoId(draft.id);
      draftId = draft.id;
      
      // Upload custom voiceover if provided
      if (config.customVoiceoverFile) {
        const uploadResult = await uploadVoiceoverMutation.mutateAsync(config.customVoiceoverFile);
        // Update the draft with voiceover URL
        await apiRequest("PATCH", `/api/promo-videos/${draft.id}`, {
          customVoiceoverUrl: uploadResult.url,
        });
      }
    } else {
      draftId = currentPromoVideoId;
    }

    // Generate narration summary if enabled (non-blocking)
    const narrationText = await ensureNarrationSummary(draftId);

    // Trigger generation with narration text if available
    await generateVideoMutation.mutateAsync(draftId);
  };

  // Helper to reorder an array by moving an item from sourceIndex to destIndex
  const reorderArray = <T,>(array: T[], sourceIndex: number, destIndex: number): T[] => {
    const result = Array.from(array);
    const [removed] = result.splice(sourceIndex, 1);
    result.splice(destIndex, 0, removed);
    return result;
  };

  // Handle scene reordering from drag-and-drop
  const handleSceneReorder = (sourceIndex: number, destIndex: number) => {
    if (sourceIndex === destIndex) return;

    console.log(`🔄 Reordering scenes: ${sourceIndex + 1} → ${destIndex + 1}`);

    setConfig(prev => {
      const newConfig = {
        ...prev,
        sceneIds: reorderArray(prev.sceneIds, sourceIndex, destIndex), // Reorder stable IDs
        uploadedImages: reorderArray(prev.uploadedImages, sourceIndex, destIndex),
        uploadedImageFiles: reorderArray(prev.uploadedImageFiles, sourceIndex, destIndex),
        imageDimensions: reorderArray(prev.imageDimensions, sourceIndex, destIndex),
        sceneDescriptions: reorderArray(prev.sceneDescriptions, sourceIndex, destIndex),
        sceneTextOverlays: reorderArray(prev.sceneTextOverlays, sourceIndex, destIndex),
        aiSceneSuggestions: reorderArray(prev.aiSceneSuggestions, sourceIndex, destIndex),
        aiTextOverlaySuggestions: reorderArray(prev.aiTextOverlaySuggestions, sourceIndex, destIndex),
      };
      
      console.log('✅ Scene reorder complete. New order:', newConfig.sceneDescriptions);
      return newConfig;
    });

    toast({
      title: "Scenes reordered",
      description: `Scene ${sourceIndex + 1} moved to position ${destIndex + 1}.`,
    });
  };

  const validateScenes = () => {
    // All scene descriptions must be filled AND all scene image slots must be filled
    const allDescriptionsFilled = config.sceneDescriptions.every(desc => desc.trim().length > 0);
    const allImageSlotsFilled = config.uploadedImageFiles.length === config.sceneCount;
    return allDescriptionsFilled && allImageSlotsFilled;
  };

  // Apply AI suggestion to a specific scene
  const applySuggestion = (index: number) => {
    setConfig(prev => ({
      ...prev,
      sceneDescriptions: prev.sceneDescriptions.map((desc, i) => 
        i === index ? prev.aiSceneSuggestions[i] : desc
      ),
    }));
    toast({
      title: "Suggestion applied",
      description: `Scene ${index + 1} description updated with AI suggestion.`,
    });
  };

  // Apply AI text overlay suggestion to a specific scene
  const applyTextOverlaySuggestion = (index: number) => {
    setConfig(prev => ({
      ...prev,
      sceneTextOverlays: prev.sceneTextOverlays.map((overlay, i) => 
        i === index ? prev.aiTextOverlaySuggestions[i] : overlay
      ),
    }));
    toast({
      title: "Text overlay applied",
      description: `Scene ${index + 1} text overlay updated with AI suggestion.`,
    });
  };

  // Generate text overlay on-demand for a specific scene
  const generateTextOverlayForScene = async (index: number) => {
    const sceneDescription = config.sceneDescriptions[index];
    if (!sceneDescription || !sceneDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please add a scene description first before generating a text overlay.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScenes(true);
    
    try {
      console.log(`📝 Generating marketing text overlay for scene ${index + 1}...`);
      const response = await fetch('/api/generate/scene-text-overlays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sceneDescriptions: [sceneDescription] }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate text overlay');
      }

      const data = await response.json();
      console.log('✅ Text overlay generated:', data);

      if (data.success && data.textOverlays && data.textOverlays.length > 0) {
        const generatedOverlay = data.textOverlays[0];
        
        setConfig(prev => ({
          ...prev,
          aiTextOverlaySuggestions: prev.aiTextOverlaySuggestions.map((overlay, i) => 
            i === index ? generatedOverlay : overlay
          ),
          sceneTextOverlays: prev.sceneTextOverlays.map((overlay, i) => 
            i === index ? generatedOverlay : overlay
          ),
        }));

        toast({
          title: "Text overlay generated",
          description: `Marketing text created for Scene ${index + 1}.`,
        });
      }
    } catch (error: any) {
      console.error('Failed to generate text overlay:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate text overlay. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  return {
    config,
    setConfig,
    setTotalDuration,
    promoVideos,
    currentPromoVideo,
    isLoadingList,
    isLoadingCurrent,
    isCreatingDraft: createDraftMutation.isPending,
    isUploadingVoiceover: uploadVoiceoverMutation.isPending,
    isGenerating: generateVideoMutation.isPending || currentPromoVideo?.status === 'generating',
    isGeneratingScenes,
    isGeneratingNarration,
    createDraft,
    uploadVoiceover,
    triggerGeneration,
    validateScenes,
    generateSceneDescriptions,
    applySuggestion,
    applyTextOverlaySuggestion,
    generateTextOverlayForScene,
    handleSceneReorder,
  };
}
