import { Video, Upload, RefreshCw, Download, X, ImageIcon, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { usePromoVideo } from "./usePromoVideo";
import type { Visual } from "@shared/schema";
import { useState, useEffect } from "react";
import { QUICKCLIP_RESOLUTIONS, type ResolutionKey } from "@shared/quickclip-utils";

interface PromoVideoGeneratorPanelProps {
  projectId: string;
  visuals?: Visual[];
}

// PromoVideo Generator: Multi-scene promotional video creator
export function PromoVideoGeneratorPanel({ projectId, visuals }: PromoVideoGeneratorPanelProps) {
  const {
    config,
    setConfig,
    setTotalDuration,
    promoVideos,
    currentPromoVideo,
    isLoadingList,
    isGenerating,
    isGeneratingScenes,
    isGeneratingNarration,
    triggerGeneration,
    validateScenes,
    generateSceneDescriptions,
    applySuggestion,
    applyTextOverlaySuggestion,
    generateTextOverlayForScene,
    handleSceneReorder,
  } = usePromoVideo(projectId);

  // State for per-scene overlay generation
  const [generatingOverlayForScene, setGeneratingOverlayForScene] = useState<number | null>(null);
  
  // State for tracking visibility of marketing text overlay inputs (keyed by sceneId for persistence through reordering)
  const [visibleOverlayIds, setVisibleOverlayIds] = useState<Set<string>>(new Set());
  // Track scenes where user explicitly clicked hide (to prevent auto-showing them again)
  const [explicitlyHiddenIds, setExplicitlyHiddenIds] = useState<Set<string>>(new Set());
  
  // Initialize visibility when scenes change - show if overlay has content OR AI suggestion exists
  // BUT respect user's explicit hide choices
  useEffect(() => {
    setVisibleOverlayIds(prev => {
      const newVisible = new Set<string>();
      
      config.sceneIds.forEach((sceneId, index) => {
        const hasContent = config.sceneTextOverlays[index]?.trim().length > 0;
        const hasSuggestion = config.aiTextOverlaySuggestions[index]?.trim().length > 0;
        const wasVisible = prev.has(sceneId);
        const isExplicitlyHidden = explicitlyHiddenIds.has(sceneId);
        
        // Show if: (has content OR has AI suggestion) AND NOT explicitly hidden by user
        if ((hasContent || hasSuggestion) && !isExplicitlyHidden) {
          newVisible.add(sceneId);
        } else if (wasVisible && !isExplicitlyHidden) {
          // Keep visible if it was already visible and user hasn't hidden it
          newVisible.add(sceneId);
        }
      });
      
      return newVisible;
    });
    
    // Clean up explicitlyHiddenIds - remove IDs that no longer exist
    // Only update state if there's an actual change to prevent infinite loop
    const validIds = new Set(config.sceneIds);
    const needsCleanup = Array.from(explicitlyHiddenIds).some(id => !validIds.has(id));
    
    if (needsCleanup) {
      setExplicitlyHiddenIds(prev => {
        const cleaned = new Set<string>();
        Array.from(prev).forEach(id => {
          if (validIds.has(id)) cleaned.add(id);
        });
        return cleaned;
      });
    }
  }, [config.sceneIds, config.sceneTextOverlays.join('|'), config.aiTextOverlaySuggestions.join('|'), explicitlyHiddenIds]);

  // Toggle text overlay visibility and generate on-demand
  const handleAddTextOverlay = async (sceneId: string, index: number) => {
    // Show the input field
    setVisibleOverlayIds(prev => {
      const newSet = new Set(prev);
      newSet.add(sceneId);
      return newSet;
    });
    setExplicitlyHiddenIds(prevHidden => {
      const newHidden = new Set(prevHidden);
      newHidden.delete(sceneId);
      return newHidden;
    });

    // Generate text overlay on-demand
    setGeneratingOverlayForScene(index);
    try {
      await generateTextOverlayForScene(index);
    } finally {
      setGeneratingOverlayForScene(null);
    }
  };

  // Hide text overlay
  const handleHideTextOverlay = (sceneId: string) => {
    setVisibleOverlayIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(sceneId);
      return newSet;
    });
    setExplicitlyHiddenIds(prevHidden => {
      const newHidden = new Set(prevHidden);
      newHidden.add(sceneId);
      return newHidden;
    });
  };

  // Handle scene position change via dropdown
  const handleScenePositionChange = (currentIndex: number, newPosition: string) => {
    const newIndex = parseInt(newPosition) - 1; // Convert to 0-based index
    if (newIndex !== currentIndex) {
      handleSceneReorder(currentIndex, newIndex);
    }
  };

  // Helper to check if dimensions match (within 2% tolerance for aspect ratio)
  const checkDimensionsMatch = (dimensions: { width: number; height: number }[]) => {
    if (dimensions.length < 2) return true;
    
    const firstAspectRatio = dimensions[0].width / dimensions[0].height;
    return dimensions.every(dim => {
      const aspectRatio = dim.width / dim.height;
      const difference = Math.abs(aspectRatio - firstAspectRatio) / firstAspectRatio;
      return difference < 0.02; // 2% tolerance
    });
  };

  const canGenerate = validateScenes();
  // Derive alignment options visibility from dimensions (no separate state needed)
  const showAlignmentOptions = config.imageDimensions.length > 1 && !checkDimensionsMatch(config.imageDimensions);

  const handleSceneDescriptionChange = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      sceneDescriptions: prev.sceneDescriptions.map((desc, i) => i === index ? value : desc),
    }));
  };

  const handleTextOverlayChange = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      sceneTextOverlays: prev.sceneTextOverlays.map((overlay, i) => i === index ? value : overlay),
    }));
  };

  const handleVoiceoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setConfig(prev => ({ ...prev, customVoiceoverFile: file }));
    }
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validate file count matches scene count
    if (files.length !== config.sceneCount) {
      alert(`Please upload exactly ${config.sceneCount} images (one for each scene).`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!files.every(file => validTypes.includes(file.type))) {
      alert('Please upload only JPG, PNG, or WebP images.');
      e.target.value = '';
      return;
    }

    // Validate file sizes (max 10MB per image)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      alert(`Some images are too large. Maximum size is 10MB per image. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }

    let imageDataWithDimensions: { url: string; width: number; height: number }[] = [];

    try {
      // Load images and get dimensions
      imageDataWithDimensions = await Promise.all(
        files.map(file => {
          return new Promise<{ url: string; width: number; height: number }>((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
              resolve({ url, width: img.width, height: img.height });
            };
            img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
            img.src = url;
          });
        })
      );

      const imageUrls = imageDataWithDimensions.map(d => d.url);
      const dimensions = imageDataWithDimensions.map(d => ({ width: d.width, height: d.height }));

      // Generate stable unique IDs for each scene (timestamp-based to ensure uniqueness)
      const sceneIds = files.map((_, index) => `scene-${Date.now()}-${index}`);

      // Use functional state update to ensure we revoke the correct URLs
      setConfig(prev => {
        // Revoke old URLs only after new ones are created
        prev.uploadedImages.forEach(url => URL.revokeObjectURL(url));
        
        return {
          ...prev,
          uploadedImages: imageUrls,
          uploadedImageFiles: files,
          imageDimensions: dimensions,
          sceneIds, // Add stable IDs for drag-and-drop
        };
      });

      // Trigger AI scene description generation after successful upload
      setTimeout(() => {
        generateSceneDescriptions(files);
      }, 100); // Small delay to let state settle

    } catch (error) {
      alert('Error loading images. Please try again.');
      e.target.value = '';
      // Clean up any created URLs on error
      imageDataWithDimensions.forEach((d: { url: string }) => URL.revokeObjectURL(d.url));
    }
  };

  const handleRemoveImage = (index: number) => {
    // Use functional state update to ensure we revoke the correct URL
    setConfig(prev => {
      // Revoke the specific URL using latest state
      if (prev.uploadedImages[index]) {
        URL.revokeObjectURL(prev.uploadedImages[index]);
      }
      
      return {
        ...prev,
        uploadedImages: prev.uploadedImages.filter((_, i) => i !== index),
        uploadedImageFiles: prev.uploadedImageFiles.filter((_, i) => i !== index),
        imageDimensions: prev.imageDimensions.filter((_, i) => i !== index),
      };
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            🎬 PromoVideo Generator
          </CardTitle>
          <CardDescription>
            Create AI-powered promotional videos with voiceovers and background music
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["step1", "step7"]} className="w-full">
            {/* Step 1: Upload Visuals for Promo Video Scenes */}
            <AccordionItem value="step1">
              <AccordionTrigger data-testid="accordion-trigger-step1">
                Step 1 - Upload Visuals for Promo Video Scenes
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="upload-images">Upload Images</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload {config.sceneCount} images (one for each scene). Images will be assigned to scenes in upload order.
                    </p>
                    <div>
                      <Input
                        id="upload-images"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleImagesUpload}
                        data-testid="input-upload-images"
                        disabled={isGenerating}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => document.getElementById('upload-images')?.click()}
                        disabled={isGenerating}
                        data-testid="button-choose-files"
                        className="bg-[#0052CC] hover:bg-[#0052CC] text-white font-bold hover-elevate active-elevate-2"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, PNG, WebP (max 10MB each)
                    </p>
                  </div>

                  {/* Image Previews */}
                  {config.uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Images ({config.uploadedImages.length}/{config.sceneCount})</Label>
                      <div className="grid grid-cols-3 gap-4">
                        {config.uploadedImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                              <img 
                                src={url} 
                                alt={`Scene ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              Scene {index + 1}
                            </div>
                            {config.imageDimensions[index] && (
                              <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {config.imageDimensions[index].width} × {config.imageDimensions[index].height}
                              </div>
                            )}
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveImage(index)}
                              disabled={isGenerating}
                              data-testid={`button-remove-image-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alignment Options (shown when dimensions don't match) */}
                  {showAlignmentOptions && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-3">
                          <p className="font-medium">
                            Uploaded images have different dimensions. Please choose how to align them in the video:
                          </p>
                          <RadioGroup
                            value={config.alignmentMode}
                            onValueChange={(value: "stretch" | "letterbox" | "crop") => 
                              setConfig(prev => ({ ...prev, alignmentMode: value }))
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="stretch" id="stretch" data-testid="radio-stretch" />
                              <Label htmlFor="stretch" className="cursor-pointer font-normal">
                                <strong>Stretch to fit</strong> - Resize images to match dimensions (may distort)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="letterbox" id="letterbox" data-testid="radio-letterbox" />
                              <Label htmlFor="letterbox" className="cursor-pointer font-normal">
                                <strong>Add black padding (letterbox)</strong> - Maintain aspect ratio, add black bars
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="crop" id="crop" data-testid="radio-crop" />
                              <Label htmlFor="crop" className="cursor-pointer font-normal">
                                <strong>Auto-crop center</strong> - Crop images to match aspect ratio
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Upload Status */}
                  {config.uploadedImages.length === 0 && (
                    <Alert>
                      <AlertDescription className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Please upload {config.sceneCount} images to proceed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Choose Scenes */}
            <AccordionItem value="step2">
              <AccordionTrigger data-testid="accordion-trigger-step2">
                Step 2 - Choose Scenes
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="scene-count">Number of Scenes</Label>
                    <Select
                      value={config.sceneCount.toString()}
                      onValueChange={(value) => 
                        setConfig(prev => ({ ...prev, sceneCount: parseInt(value) as 3 | 4 | 5 }))
                      }
                    >
                      <SelectTrigger id="scene-count" data-testid="select-scene-count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Scenes</SelectItem>
                        <SelectItem value="4">4 Scenes</SelectItem>
                        <SelectItem value="5">5 Scenes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isGeneratingScenes && (
                    <Alert>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertDescription>
                        Generating scene descriptions with AI... This may take a few seconds.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Reorder Hint Banner */}
                  {config.uploadedImages.length === config.sceneCount && (
                    <Alert className="bg-primary/10 border-primary/20">
                      <AlertDescription>
                        <p className="text-sm">
                          💡 <strong>Tip:</strong> You can change scene order using the dropdown selector in each scene.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {config.sceneDescriptions.map((desc, index) => {
                      const hasSuggestion = config.aiSceneSuggestions[index] && config.aiSceneSuggestions[index] !== desc;
                      const hasTextOverlaySuggestion = config.aiTextOverlaySuggestions[index] && 
                                                        config.aiTextOverlaySuggestions[index] !== config.sceneTextOverlays[index];
                      const textOverlay = config.sceneTextOverlays[index] || "";
                      const wordCount = textOverlay.trim().split(/\s+/).filter(w => w.length > 0).length;
                      const hasExceedingWords = wordCount > 10;
                      const hasEndingPeriod = textOverlay.trim().endsWith('.');
                      const sceneId = config.sceneIds[index] || `scene-fallback-${index}`;
                      
                      return (
                        <div
                          key={sceneId}
                          className="space-y-3 p-4 border rounded-lg"
                          data-testid={`scene-card-${index + 1}`}
                        >
                          {/* Scene Description */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 flex-1">
                                <Label htmlFor={`scene-${index + 1}`} className="shrink-0">
                                  Scene {index + 1} Description
                                </Label>
                                {/* Scene Position Selector */}
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`scene-position-${index + 1}`} className="text-sm text-muted-foreground shrink-0">
                                    Position:
                                  </Label>
                                  <Select
                                    value={(index + 1).toString()}
                                    onValueChange={(value) => handleScenePositionChange(index, value)}
                                    disabled={isGeneratingScenes}
                                  >
                                    <SelectTrigger 
                                      id={`scene-position-${index + 1}`} 
                                      className="w-24"
                                      data-testid={`select-scene-position-${index + 1}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: config.sceneCount }, (_, i) => i + 1).map((position) => (
                                        <SelectItem key={position} value={position.toString()}>
                                          Scene {position}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {hasSuggestion && !isGeneratingScenes && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applySuggestion(index)}
                                  data-testid={`button-apply-suggestion-${index + 1}`}
                                >
                                  Use suggestion
                                </Button>
                              )}
                            </div>
                            <Textarea
                              id={`scene-${index + 1}`}
                              placeholder={`Describe what happens in scene ${index + 1}...`}
                              value={desc}
                              onChange={(e) => handleSceneDescriptionChange(index, e.target.value)}
                              className="resize-none"
                              rows={3}
                              disabled={isGeneratingScenes}
                              data-testid={`textarea-scene-description-${index + 1}`}
                            />
                            {hasSuggestion && !isGeneratingScenes && (
                              <p className="text-xs text-muted-foreground">
                                💡 AI suggestion: "{config.aiSceneSuggestions[index]}"
                              </p>
                            )}
                          </div>

                          {/* Marketing Text Overlay - Show/Hide Toggle */}
                          <div className="space-y-2 pt-2 border-t">
                            {!visibleOverlayIds.has(sceneId) ? (
                              // Show "+ Add Marketing Text Overlay" button when hidden
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddTextOverlay(sceneId, index)}
                                className="w-full"
                                disabled={generatingOverlayForScene === index}
                                data-testid={`button-add-text-overlay-${index + 1}`}
                              >
                                {generatingOverlayForScene === index ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Marketing Text Overlay
                                  </>
                                )}
                              </Button>
                            ) : (
                              // Show input field when visible
                              <>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`text-overlay-${index + 1}`} className="text-sm">
                                    Marketing Text Overlay (Optional)
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    {hasTextOverlaySuggestion && !isGeneratingScenes && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyTextOverlaySuggestion(index)}
                                        data-testid={`button-apply-text-overlay-suggestion-${index + 1}`}
                                      >
                                        Use suggestion
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleHideTextOverlay(sceneId)}
                                      data-testid={`button-remove-text-overlay-${index + 1}`}
                                    >
                                      <Minus className="h-4 w-4 mr-1" />
                                      Hide
                                    </Button>
                                  </div>
                                </div>
                                <Input
                                  id={`text-overlay-${index + 1}`}
                                  placeholder="Short marketing text (max 10 words, no periods)"
                                  value={textOverlay}
                                  onChange={(e) => handleTextOverlayChange(index, e.target.value)}
                                  disabled={isGeneratingScenes}
                                  data-testid={`input-text-overlay-${index + 1}`}
                                  className={hasExceedingWords || hasEndingPeriod ? "border-destructive" : ""}
                                />
                                <div className="flex items-center justify-between text-xs">
                                  {hasTextOverlaySuggestion && !isGeneratingScenes && (
                                    <p className="text-muted-foreground">
                                      💡 "{config.aiTextOverlaySuggestions[index]}"
                                    </p>
                                  )}
                                  <p className={`ml-auto ${hasExceedingWords ? "text-destructive" : "text-muted-foreground"}`}>
                                    {wordCount}/10 words {hasEndingPeriod && "• Remove period"}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Add Voiceover */}
            <AccordionItem value="step3">
              <AccordionTrigger data-testid="accordion-trigger-step3">
                Step 3 - Add Voiceover
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voice-language">Language</Label>
                      <Select
                        value={config.voiceLanguage}
                        onValueChange={(value: "ms" | "en" | "zh") => 
                          setConfig(prev => ({ ...prev, voiceLanguage: value }))
                        }
                      >
                        <SelectTrigger id="voice-language" data-testid="select-voice-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ms">Bahasa Melayu</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voice-type">Voice Type</Label>
                      <Select
                        value={config.voiceType}
                        onValueChange={(value: "male" | "female") => 
                          setConfig(prev => ({ ...prev, voiceType: value }))
                        }
                      >
                        <SelectTrigger id="voice-type" data-testid="select-voice-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-voiceover">Custom Voiceover (Optional)</Label>
                    <Input
                      id="custom-voiceover"
                      type="file"
                      accept="audio/*"
                      onChange={handleVoiceoverUpload}
                      data-testid="input-custom-voiceover"
                    />
                    {config.customVoiceoverFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {config.customVoiceoverFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Add Music */}
            <AccordionItem value="step4">
              <AccordionTrigger data-testid="accordion-trigger-step4">
                Step 4 - Add Music
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <Label>Background Music Style</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {(["calm", "modern", "corporate", "soft", "energetic"] as const).map((style) => (
                      <Button
                        key={style}
                        variant={config.musicStyle === style ? "default" : "outline"}
                        onClick={() => setConfig(prev => ({ ...prev, musicStyle: style }))}
                        className="capitalize"
                        data-testid={`button-music-${style}`}
                      >
                        {style}
                      </Button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 5: Select Total Video Duration */}
            <AccordionItem value="step5">
              <AccordionTrigger data-testid="accordion-trigger-step5">
                Step 5 - Select Total Video Duration
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <Label>Total Video Length</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose the total duration of your promotional video. Time per scene will be allocated automatically.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={config.durationMode === "manual" && config.totalDuration === 15 ? "default" : "outline"}
                      onClick={() => setTotalDuration(15)}
                      className="h-auto min-h-[4rem] flex flex-col items-start justify-center p-4 whitespace-normal text-left"
                      data-testid="button-duration-15"
                    >
                      <span className="font-semibold text-sm">15 seconds</span>
                      <span className="text-xs opacity-80 mt-1">Quick overview</span>
                    </Button>
                    
                    <Button
                      variant={config.durationMode === "manual" && config.totalDuration === 30 ? "default" : "outline"}
                      onClick={() => setTotalDuration(30)}
                      className="h-auto min-h-[4rem] flex flex-col items-start justify-center p-4 whitespace-normal text-left"
                      data-testid="button-duration-30"
                    >
                      <span className="font-semibold text-sm">30 seconds</span>
                      <span className="text-xs opacity-80 mt-1">Balanced storytelling</span>
                    </Button>
                    
                    <Button
                      variant={config.durationMode === "manual" && config.totalDuration === 60 ? "default" : "outline"}
                      onClick={() => setTotalDuration(60)}
                      className="h-auto min-h-[4rem] flex flex-col items-start justify-center p-4 whitespace-normal text-left"
                      data-testid="button-duration-60"
                    >
                      <span className="font-semibold text-sm">60 seconds</span>
                      <span className="text-xs opacity-80 mt-1">More detailed visuals & voiceover</span>
                    </Button>
                    
                    <Button
                      variant={config.durationMode === "auto" ? "default" : "outline"}
                      onClick={() => setTotalDuration("auto")}
                      className="h-auto min-h-[4rem] flex flex-col items-start justify-center p-4 whitespace-normal text-left"
                      data-testid="button-duration-auto"
                    >
                      <span className="font-semibold text-sm">Auto</span>
                      <span className="text-xs opacity-80 mt-1">Let AI decide best duration</span>
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 6: Add Narration Summary (Optional) */}
            <AccordionItem value="step6">
              <AccordionTrigger data-testid="accordion-trigger-step6">
                Step 6 - Add Narration Summary (Optional)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="enable-narration" className="text-base">
                        Enable narration summary
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, we will generate a short voice-over paragraph at the end of your video to wrap up the message with a call to action.
                      </p>
                    </div>
                    <Switch
                      id="enable-narration"
                      checked={config.enableNarrationSummary}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({ ...prev, enableNarrationSummary: checked }))
                      }
                      data-testid="switch-enable-narration"
                    />
                  </div>

                  {config.enableNarrationSummary && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="narration-text">Narration Summary Preview</Label>
                      <p className="text-xs text-muted-foreground">
                        The AI will generate a 3-sentence summary with a call to action when you click Generate. You can edit it here after generation.
                      </p>
                      <Textarea
                        id="narration-text"
                        placeholder="Narration text will appear here after generation..."
                        value={config.narrationSummaryText}
                        onChange={(e) => 
                          setConfig(prev => ({ ...prev, narrationSummaryText: e.target.value }))
                        }
                        className="resize-none"
                        rows={4}
                        disabled={isGeneratingNarration}
                        data-testid="textarea-narration-summary"
                      />
                      {isGeneratingNarration && (
                        <Alert>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <AlertDescription>
                            Generating narration summary... This may take a few seconds.
                          </AlertDescription>
                        </Alert>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Language: {config.voiceLanguage === 'ms' ? 'Bahasa Melayu' : config.voiceLanguage === 'en' ? 'English' : 'Chinese'}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 7: Generate */}
            <AccordionItem value="step7">
              <AccordionTrigger data-testid="accordion-trigger-step7">
                Step 7 - Generate
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2 text-sm">
                        <p><strong>Configuration Summary:</strong></p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>{config.sceneCount} scenes configured</li>
                          <li>Voiceover: {config.voiceLanguage === 'ms' ? 'Bahasa Melayu' : config.voiceLanguage === 'en' ? 'English' : 'Chinese'} ({config.voiceType})</li>
                          <li>Music: {config.musicStyle} style</li>
                          <li>Duration: {config.durationMode === "auto" ? `Auto (${config.totalDuration}s)` : `${config.totalDuration} seconds`}</li>
                          <li>Narration Summary: {config.enableNarrationSummary ? "Enabled" : "Disabled"}</li>
                          {config.customVoiceoverFile && <li>Custom voiceover: {config.customVoiceoverFile.name}</li>}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {!canGenerate && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {config.uploadedImageFiles.length !== config.sceneCount && (
                            <li>Upload {config.sceneCount} images (currently {config.uploadedImageFiles.length}/{config.sceneCount})</li>
                          )}
                          {!config.sceneDescriptions.every(desc => desc.trim().length > 0) && (
                            <li>Fill in all scene descriptions</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Video Resolution Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="video-resolution">Video Resolution</Label>
                    <Select
                      value={config.videoResolution}
                      onValueChange={(value: ResolutionKey) => 
                        setConfig(prev => ({ ...prev, videoResolution: value }))
                      }
                    >
                      <SelectTrigger id="video-resolution" data-testid="select-video-resolution">
                        <SelectValue placeholder="Select video resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUICKCLIP_RESOLUTIONS.map((resolution) => (
                          <SelectItem 
                            key={resolution.key} 
                            value={resolution.key}
                            data-testid={`resolution-option-${resolution.key}`}
                          >
                            {resolution.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Default: 3:4 (Portrait) - 720p
                    </p>
                  </div>

                  <Button
                    onClick={triggerGeneration}
                    disabled={!canGenerate || isGenerating}
                    className="w-full"
                    size="lg"
                    data-testid="button-generate-promo-video"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Video...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Generate Promotional Video
                      </>
                    )}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Video Status & Player */}
      {currentPromoVideo && (
        <Card>
          <CardHeader>
            <CardTitle>Video Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={currentPromoVideo.status === 'completed' ? 'default' : 'secondary'}>
                  {currentPromoVideo.status}
                </Badge>
              </div>

              {currentPromoVideo.status === 'completed' && currentPromoVideo.videoUrl && (
                <div className="space-y-2">
                  <Label>Generated Video</Label>
                  <video
                    src={currentPromoVideo.videoUrl}
                    controls
                    className="w-full rounded-lg border"
                    data-testid="video-player"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => currentPromoVideo.videoUrl && window.open(currentPromoVideo.videoUrl, '_blank')}
                    data-testid="button-download-video"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                </div>
              )}

              {currentPromoVideo.status === 'failed' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Video generation failed. Please try again or contact support if the issue persists.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Videos */}
      {promoVideos && promoVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Videos</CardTitle>
            <CardDescription>Your generated promotional videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingList ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                promoVideos.map((video: any) => (
                  <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{video.config?.sceneCount || 0} scenes</p>
                      <p className="text-sm text-muted-foreground">
                        {video.config?.language || 'N/A'} • {video.config?.voiceType || 'N/A'} • {video.config?.musicStyle || 'N/A'}
                      </p>
                    </div>
                    <Badge>{video.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
