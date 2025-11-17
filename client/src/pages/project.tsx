import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Wand2, Image as ImageIcon, FileText, Sparkles, Upload, Download, PenLine, User, RefreshCw, Trash2, Info, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { Project, GenerateAdCopyRequest, GenerateVisualRequest, FusionVisualRequest, GenerateBrandKitRequest, Visual, TextContent } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PromoVideoTab } from "@/components/project/promo-video/PromoVideoTab";
import { Image2ImageMode } from "@/components/project/Image2ImageMode";


const IconX = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

export default function ProjectPage() {
  const [, params] = useRoute("/project/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isNewProject = params?.id === "new";

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Ad Copy Generation State
  const [adPlatform, setAdPlatform] = useState<'facebook' | 'instagram' | 'google_ads' | 'twitter'>('facebook');
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [adTone, setAdTone] = useState<'professional' | 'casual' | 'friendly' | 'energetic'>('professional');

  // Visual Generation State
  const [visualPrompt, setVisualPrompt] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [numberOfImages, setNumberOfImages] = useState(3);
  const [useBrandKitOnly, setUseBrandKitOnly] = useState(false);
  const [promptWasEnhanced, setPromptWasEnhanced] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [uploadedImageForCaption, setUploadedImageForCaption] = useState<string>("");

  // Image2Image State
  const [uploadedImageForTransform, setUploadedImageForTransform] = useState<string>("");

  // Fusion Visual State
  const [productImage, setProductImage] = useState<string>("");
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [placementDescription, setPlacementDescription] = useState("");
  const [fusionStyle, setFusionStyle] = useState("");

  // BrandKit State
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [brandDescription, setBrandDescription] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params?.id],
    enabled: !isNewProject && !!params?.id,
  });

  const { data: visuals } = useQuery<Visual[]>({
    queryKey: ["/api/projects", params?.id, "visuals"],
    enabled: !isNewProject && !!params?.id,
  });

  // 🧪 DEBUG: Check if videos are in the visuals array
  useEffect(() => {
    if (visuals) {
      console.log('[DEBUG Generated Visuals] Total visuals:', visuals.length);
      console.log('[DEBUG Generated Visuals] Full visuals array:', visuals);
      
      const videos = visuals.filter(v => v.mediaType === 'video');
      console.log('[DEBUG Generated Visuals] Videos found:', videos.length);
      console.log('[DEBUG Generated Visuals] Video details:', videos);
      
      const quickclips = visuals.filter(v => v.type === 'quickclip');
      console.log('[DEBUG Generated Visuals] QuickClips found:', quickclips.length);
      console.log('[DEBUG Generated Visuals] QuickClip details:', quickclips);
    }
  }, [visuals]);

  const { data: textContents } = useQuery<TextContent[]>({
    queryKey: ["/api/projects", params?.id, "content"],
    enabled: !isNewProject && !!params?.id,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest("POST", "/api/projects", data);
    },
    onSuccess: (newProject: Project) => {
      toast({
        title: "Project created",
        description: "Your project has been created successfully.",
      });
      setLocation(`/project/${newProject.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const generateAdCopyMutation = useMutation({
    mutationFn: async (data: GenerateAdCopyRequest) => {
      return await apiRequest("POST", "/api/generate/ad-copy", data);
    },
    onSuccess: () => {
      toast({
        title: "Ad copy generated",
        description: "Your AI-powered ad copy is ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id, "content"] });
    },
  });

  const generateVisualMutation = useMutation({
    mutationFn: async (data: GenerateVisualRequest) => {
      return await apiRequest("POST", "/api/generate/visual", data);
    },
    onSuccess: () => {
      toast({
        title: "Visual generated",
        description: "Your AI-powered visual is ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id, "visuals"] });
    },
  });

  const generateFusionMutation = useMutation({
    mutationFn: async (data: FusionVisualRequest) => {
      return await apiRequest("POST", "/api/generate/fusion", data);
    },
    onSuccess: () => {
      toast({
        title: "Fusion visual created",
        description: "Your product fusion visual is ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id, "visuals"] });
    },
  });

  const generatePlacementSuggestionMutation = useMutation({
    mutationFn: async (data: { productDescription: string; backgroundContext: string }) => {
      return await apiRequest("POST", "/api/generate/placement-suggestion", data);
    },
    onSuccess: (data: { suggestion: string }) => {
      setPlacementDescription(data.suggestion);
      toast({
        title: "AI Suggestion Generated",
        description: "Placement suggestion has been added to the field.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Suggestion Failed",
        description: error.message || "Failed to generate AI suggestion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const regenerateFusionMutation = useMutation({
    mutationFn: async (data: { visualId: string; projectId: string }) => {
      return await apiRequest("POST", `/api/visuals/${data.visualId}/regenerate`, { projectId: data.projectId });
    },
    onSuccess: () => {
      toast({
        title: "Fusion visual regenerated",
        description: "Your fusion visual has been regenerated!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id, "visuals"] });
    },
  });

  const deleteVisualMutation = useMutation({
    mutationFn: async (visualId: string) => {
      return await apiRequest("DELETE", `/api/visuals/${visualId}`);
    },
    onSuccess: () => {
      toast({
        title: "Visual deleted",
        description: "The visual has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id, "visuals"] });
    },
  });

  const generateBrandKitMutation = useMutation({
    mutationFn: async (data: GenerateBrandKitRequest) => {
      return await apiRequest("POST", "/api/generate/brandkit", data);
    },
    onSuccess: () => {
      toast({
        title: "BrandKit generated",
        description: "Your brand guidelines are ready!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id] });
    },
  });

  const optimizePromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest("POST", "/api/optimize-prompt", { prompt });
    },
    onSuccess: (data: { optimizedPrompt: string }) => {
      setVisualPrompt(data.optimizedPrompt);
      setPromptWasEnhanced(true);
      toast({
        title: "Prompt optimized",
        description: "Your prompt has been enhanced for better results!",
      });
    },
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }
    createProjectMutation.mutate({
      name: projectName,
      description: projectDescription || undefined,
    });
  };

  const handleGenerateAdCopy = () => {
    if (!productName || !productDescription) {
      toast({
        title: "Missing information",
        description: "Please fill in product name and description.",
        variant: "destructive",
      });
      return;
    }
    generateAdCopyMutation.mutate({
      projectId: params?.id || "",
      platform: adPlatform,
      productName,
      productDescription,
      targetAudience: targetAudience || undefined,
      tone: adTone,
    });
  };

  const handleGenerateVisual = async () => {
    // If checkbox is enabled, force empty prompt for __BLANK__ mode
    if (useBrandKitOnly) {
      generateVisualMutation.mutate({
        projectId: params?.id || "",
        prompt: "", // Empty for __BLANK__ mode
        negativePrompt: negativePrompt || undefined,
        numberOfImages: numberOfImages,
        size: project?.size,
        style: visualStyle || undefined,
      });
      return;
    }

    // For normal mode, enhance the prompt first if there's text
    let enhancedPrompt = visualPrompt;
    
    if (visualPrompt.trim() && !promptWasEnhanced) {
      try {
        // Show loading state
        const result = await optimizePromptMutation.mutateAsync(visualPrompt);
        enhancedPrompt = result.optimizedPrompt;
        setVisualPrompt(enhancedPrompt);
        setPromptWasEnhanced(true);
        
        toast({
          title: "Prompt Enhanced",
          description: "Your prompt has been optimized for better results!",
        });
      } catch (error) {
        console.warn("Prompt enhancement failed, using original:", error);
        // Continue with original prompt
      }
    }

    generateVisualMutation.mutate({
      projectId: params?.id || "",
      prompt: enhancedPrompt,
      negativePrompt: negativePrompt || undefined,
      numberOfImages: numberOfImages,
      size: project?.size,
      style: visualStyle || undefined,
    });
  };

  const handleGenerateFusion = () => {
    if (!productImage || !backgroundPrompt) {
      toast({
        title: "Missing information",
        description: "Please upload a product image and describe the background.",
        variant: "destructive",
      });
      return;
    }
    generateFusionMutation.mutate({
      projectId: params?.id || "",
      productImageData: productImage,
      backgroundPrompt,
      placementDescription: placementDescription || undefined,
      style: fusionStyle || undefined,
    });
  };

  const handleAISuggest = () => {
    if (!backgroundPrompt.trim()) {
      toast({
        title: "Background description required",
        description: "Please describe the background scene first.",
        variant: "destructive",
      });
      return;
    }

    generatePlacementSuggestionMutation.mutate({
      productDescription: project?.description || "product",
      backgroundContext: backgroundPrompt,
    });
  };

  const handleGenerateBrandKit = () => {
    if (!brandName || !industry || !brandDescription) {
      toast({
        title: "Missing information",
        description: "Please fill in all brand details.",
        variant: "destructive",
      });
      return;
    }
    generateBrandKitMutation.mutate({
      projectId: params?.id || "",
      brandName,
      industry,
      description: brandDescription,
    });
  };

  const handleRegenerateFusion = (visualId: string) => {
    if (!params?.id) return;
    regenerateFusionMutation.mutate({ visualId, projectId: params.id });
  };

  const handleDeleteVisual = (visualId: string) => {
    deleteVisualMutation.mutate(visualId);
  };

  // Helper to check if current fusion inputs match a visual's original parameters
  const canRegenerateFusion = (visual: Visual): boolean => {
    if (visual.type !== "fusion") return false;

    // Get the original parameters from metadata
    const metadata = visual.metadata as any;
    if (!metadata) return false;

    const originalBackground = metadata.backgroundPrompt || "";
    const originalPlacement = metadata.placementDescription || "";
    const originalStyle = metadata.style || "";

    // Compare with current form values
    const backgroundMatches = backgroundPrompt.trim() === originalBackground.trim();
    const placementMatches = (placementDescription || "").trim() === originalPlacement.trim();
    const styleMatches = (fusionStyle || "").trim() === originalStyle.trim();

    return backgroundMatches && placementMatches && styleMatches;
  };

  const handleOptimizePrompt = () => {
    if (!visualPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a visual description first.",
        variant: "destructive",
      });
      return;
    }
    setPromptWasEnhanced(false); // Reset before optimizing
    optimizePromptMutation.mutate(visualPrompt);
  };

  const handleGenerateCaption = async () => {
    if (!uploadedImageForCaption) {
      toast({
        title: "Image required",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCaption(true);
    try {
      const response = await apiRequest("POST", "/api/generate/caption", {
        imageURL: uploadedImageForCaption,
      });
      
      setVisualPrompt(response.caption);
      setPromptWasEnhanced(false);
      toast({
        title: "Caption Generated",
        description: "Image description has been added to the script box.",
      });
    } catch (error: any) {
      toast({
        title: "Caption Generation Failed",
        description: error.message || "Failed to generate caption. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageForCaption(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isNewProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold">Create New Project</h1>
            <p className="text-muted-foreground mt-1">Start your creative journey</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Give your project a name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Summer Campaign 2024"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Describe your project..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                data-testid="input-project-description"
              />
            </div>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
              data-testid="button-create-project"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">Project not found</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isCommunityDuplicate = project.name.includes('(Community Copy)');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold" data-testid="text-project-name">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" data-testid="button-download">
            <Download className="h-5 w-5" />
          </Button>
          <Button size="icon" data-testid="button-save">
            <Save className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isCommunityDuplicate && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid="alert-community-duplicate">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            You are editing a duplicated project from the Community. Don't forget to Save it to your Project after customization.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="ad-copy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="ad-copy" data-testid="tab-ad-copy">
                  <FileText className="h-4 w-4 mr-2" />
                  🧠 Content
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate social media posts with AI — headline, description, hashtags, image, and layout.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="visual" data-testid="tab-visual">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  🖼️ Enhance
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload an image to enhance it with AI and generate visual designs using a smart script.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="image2image" data-testid="tab-image2image">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  🔄 Image2Image
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Transform your images with AI-powered style transfer and artistic filters.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="fusion" data-testid="tab-fusion">
                  <Sparkles className="h-4 w-4 mr-2" />
                  🛍️ Fusion
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Combine your product image with a background scene using AI-powered product placement.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="promo-video" data-testid="tab-video-maker">
                  <Video className="h-4 w-4 mr-2" />
                  🎬 VideoMaker
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create videos with AI: Quick single-image clips or multi-scene promotional videos.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="brandkit" data-testid="tab-brandkit">
                  <Wand2 className="h-4 w-4 mr-2" />
                  BrandKit
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage your brand identity and design guidelines.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TabsList>

        <TabsContent value="ad-copy" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="flex flex-col md:block">
              <CardHeader className="px-4 sm:px-6 flex-shrink-0">
                <CardTitle className="text-lg sm:text-xl">Generate Ad Copy</CardTitle>
                <CardDescription>Create AI-powered advertising content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 sm:space-y-6 px-4 sm:px-6 pb-20 md:pb-6 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="ad-platform">Platform</Label>
                  <Select value={adPlatform} onValueChange={(v: any) => setAdPlatform(v)}>
                    <SelectTrigger id="ad-platform" data-testid="select-ad-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    placeholder="Enter product name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    data-testid="input-product-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-desc">Product Description</Label>
                  <Textarea
                    id="product-desc"
                    placeholder="Describe your product..."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    data-testid="input-product-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-audience">Target Audience (Optional)</Label>
                  <Input
                    id="target-audience"
                    placeholder="e.g., Young professionals"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    data-testid="input-target-audience"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad-tone">Tone</Label>
                  <Select value={adTone} onValueChange={(v: any) => setAdTone(v)}>
                    <SelectTrigger id="ad-tone" data-testid="select-ad-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <div className="fixed md:relative bottom-0 left-0 right-0 p-4 bg-card border-t md:border-t-0 md:p-0 md:px-6 md:pb-6 z-10">
                <Button
                  onClick={handleGenerateAdCopy}
                  disabled={generateAdCopyMutation.isPending}
                  className="w-full"
                  size="default"
                  data-testid="button-generate-ad-copy"
                >
                  {generateAdCopyMutation.isPending ? "Generating..." : "Generate Ad Copy"}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Generated Content</CardTitle>
                <CardDescription>Your AI-created ad copy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
                {textContents && textContents.length > 0 ? (
                  textContents
                    .filter((tc) => tc.type === "ad_copy")
                    .map((tc) => (
                      <Card key={tc.id} data-testid={`card-text-content-${tc.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary">
                              {tc.metadata?.platform || "Ad Copy"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(tc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{tc.content}</p>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No ad copy generated yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visual" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload & Enhance Visuals with AI</CardTitle>
                <CardDescription>Upload an image or write your own prompt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Upload Image */}
                <div className="space-y-2">
                  <Label>1. Upload Image (JPG or PNG, max 10MB)</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleCaptionImageUpload}
                    className="hidden"
                    id="upload-caption-image"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('upload-caption-image')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  {uploadedImageForCaption && (
                    <div className="mt-2 relative">
                      <img src={uploadedImageForCaption} alt="Uploaded" className="w-full h-32 object-contain rounded-md border" />
                      <button
                        onClick={() => {
                          setUploadedImageForCaption("");
                          setVisualPrompt("");
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2: Generate Caption Script */}
                {uploadedImageForCaption && (
                  <div className="space-y-2">
                    <Label>2. Generate Caption Script</Label>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGenerateCaption}
                      disabled={isGeneratingCaption}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isGeneratingCaption ? "Generating..." : "Generate Script"}
                    </Button>
                  </div>
                )}

                {/* Step 3: Script Box (Editable) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="visual-prompt">3. Script</Label>
                      {promptWasEnhanced && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Enhanced
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOptimizePrompt}
                      disabled={optimizePromptMutation.isPending || !visualPrompt.trim() || useBrandKitOnly}
                      data-testid="button-optimize-prompt"
                      className="h-7 text-xs"
                    >
                      <PenLine className="h-3.5 w-3.5 mr-1.5" />
                      {optimizePromptMutation.isPending ? "Optimizing..." : "Smart Optimizer"}
                    </Button>
                  </div>
                  <Textarea
                    id="visual-prompt"
                    placeholder={
                      useBrandKitOnly
                        ? "Script disabled in Brand Kit Mode - using brand colors only"
                        : "e.g., A woman standing under cherry blossoms, cinematic lighting. You can also skip image upload and write your own prompt in the script box."
                    }
                    value={visualPrompt}
                    onChange={(e) => {
                      setVisualPrompt(e.target.value);
                      if (promptWasEnhanced) {
                        setPromptWasEnhanced(false);
                      }
                    }}
                    rows={5}
                    disabled={useBrandKitOnly}
                    data-testid="input-visual-prompt"
                    className={useBrandKitOnly ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </div>

                {/* Auto-Enhancement Notice */}
                {!useBrandKitOnly && visualPrompt.trim() && (
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                      {promptWasEnhanced 
                        ? "✓ Prompt has been enhanced for optimal results"
                        : "Your prompt will be automatically enhanced when you click Generate"}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Step 4: Brand Kit Mode Checkbox */}
                <div className="flex items-center space-x-2 pt-2 pb-2 border-t">
                  <Checkbox
                    id="brand-kit-only"
                    checked={useBrandKitOnly}
                    onCheckedChange={(checked) => {
                      setUseBrandKitOnly(checked as boolean);
                      if (checked) {
                        setVisualPrompt("");
                        setPromptWasEnhanced(false);
                      }
                    }}
                    data-testid="checkbox-brand-kit-only"
                  />
                  <Label 
                    htmlFor="brand-kit-only" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Brand Kit Mode (override prompt with brand colors only)
                  </Label>
                </div>

                {/* Step 5: Negative Prompt Field */}
                <div className="space-y-2">
                  <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                  <Textarea
                    id="negative-prompt"
                    placeholder="e.g., text, people, logos, low quality"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                    data-testid="input-negative-prompt"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exclude unwanted elements from the generated image
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number-of-images">Number of Images</Label>
                  <Select value={numberOfImages.toString()} onValueChange={(v) => setNumberOfImages(parseInt(v))}>
                    <SelectTrigger id="number-of-images" data-testid="select-number-images">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Image</SelectItem>
                      <SelectItem value="2">2 Images</SelectItem>
                      <SelectItem value="3">3 Images</SelectItem>
                      <SelectItem value="4">4 Images</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 6: Generate Image */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleGenerateVisual}
                        disabled={generateVisualMutation.isPending || optimizePromptMutation.isPending}
                        className="w-full"
                        data-testid="button-generate-visual"
                      >
                        {optimizePromptMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Enhancing Prompt...
                          </>
                        ) : generateVisualMutation.isPending ? (
                          "Generating..."
                        ) : (
                          "Generate Image"
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {useBrandKitOnly 
                          ? "Generate using brand colors only" 
                          : "Your prompt will be automatically enhanced before generation"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Visuals</CardTitle>
                <CardDescription>Your AI-created images and videos (latest highlighted)</CardDescription>
              </CardHeader>
              <CardContent>
                {visuals && visuals.filter((v) => v.type === "generated" || v.type === "image2image" || v.type === "quickclip").length > 0 ? (
                  <div className="flex gap-4 flex-wrap pb-4">
                    {visuals
                      .filter((v) => v.type === "generated" || v.type === "image2image" || v.type === "quickclip")
                      .reverse()
                      .map((visual, index) => (
                        <Card 
                          key={visual.id} 
                          data-testid={`card-visual-${visual.id}`}
                          className={`w-full max-w-[16rem] flex-1 cursor-pointer transition-all ${
                            index === 0 ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                          }`}
                        >
                          <CardContent className="p-0">
                            {visual.mediaType === "video" ? (
                              <div className="relative group">
                                <video
                                  src={visual.videoUrl || ""}
                                  controls
                                  className="w-full h-48 object-cover rounded-t-md bg-black"
                                  data-testid={`video-${visual.id}`}
                                />
                                <a
                                  href={visual.videoUrl || ""}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-download-video-${visual.id}`}
                                >
                                  <Button size="icon" variant="secondary">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                              </div>
                            ) : (
                              <img
                                src={visual.imageUrl || undefined}
                                alt={visual.prompt || "Generated visual"}
                                className="w-full h-48 object-cover rounded-t-md"
                              />
                            )}
                            <div className="p-3 space-y-2">
                              {index === 0 && (
                                <Badge className="mb-2">Latest</Badge>
                              )}
                              {visual.type === "quickclip" && (
                                <Badge variant="outline" className="mb-2">QuickClip Video</Badge>
                              )}
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {visual.prompt || visual.type === "quickclip" ? "QuickClip video generated" : "No prompt"}
                              </p>
                              {visual.mediaType !== "video" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await apiRequest("POST", "/api/runware/generate-caption", {
                                        imageURL: visual.imageUrl,
                                      });
                                      toast({
                                        title: "Script Generated",
                                        description: response.caption,
                                        duration: 10000,
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: "Script Generation Failed",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="w-full text-xs"
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Generate Script
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No visuals generated yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fusion" className="space-y-6">
          {user && (
            <Card className="mb-6" data-testid="card-user-profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold" data-testid="text-user-name">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                      {user.email}
                    </p>
                  </div>
                </CardTitle>
                <CardDescription>
                  Creating fusion visuals as authenticated user
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fusion Visual Generator</CardTitle>
                <CardDescription>Combine product with AI background</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-image">Product Image</Label>
                  <div className="border-2 border-dashed rounded-md p-8 text-center hover-elevate">
                    <input
                      type="file"
                      id="product-image"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="input-product-image"
                    />
                    <label htmlFor="product-image" className="cursor-pointer">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt="Product preview"
                          className="max-h-48 mx-auto rounded-md"
                        />
                      ) : (
                        <div>
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload product image
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background-prompt">1. Background Description</Label>
                  <Textarea
                    id="background-prompt"
                    placeholder="Describe the background you want..."
                    value={backgroundPrompt}
                    onChange={(e) => setBackgroundPrompt(e.target.value)}
                    rows={4}
                    data-testid="input-background-prompt"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="placement-description">2. Describe How to Place the Product</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAISuggest}
                      disabled={generatePlacementSuggestionMutation.isPending || !backgroundPrompt.trim()}
                      data-testid="button-ai-suggest"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generatePlacementSuggestionMutation.isPending ? "Generating..." : "AI Suggest"}
                    </Button>
                  </div>
                  <Textarea
                    id="placement-description"
                    placeholder="e.g., Place the product on a wooden kitchen table with soft natural light..."
                    value={placementDescription}
                    onChange={(e) => setPlacementDescription(e.target.value)}
                    rows={3}
                    data-testid="input-placement-description"
                  />
                  <p className="text-xs text-muted-foreground">
                    Click "AI Suggest" to generate a placement suggestion based on your background description
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fusion-style">3. Style (Optional)</Label>
                  <Input
                    id="fusion-style"
                    placeholder="e.g., professional, artistic"
                    value={fusionStyle}
                    onChange={(e) => setFusionStyle(e.target.value)}
                    data-testid="input-fusion-style"
                  />
                </div>
                <Button
                  onClick={handleGenerateFusion}
                  disabled={generateFusionMutation.isPending || !user}
                  className="w-full"
                  data-testid="button-generate-fusion"
                >
                  {generateFusionMutation.isPending ? "Creating..." : !user ? "Sign in to create" : "Create Fusion Visual"}
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground text-center" data-testid="text-auth-required">
                    Authentication required to generate fusion visuals
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fusion Visuals</CardTitle>
                <CardDescription>Your product fusion images</CardDescription>
              </CardHeader>
              <CardContent>
                {visuals && visuals.filter((v) => v.type === "fusion").length > 0 ? (
                  <div className="grid gap-4">
                    {visuals
                      .filter((v) => v.type === "fusion")
                      .map((visual) => (
                        <Card key={visual.id} data-testid={`card-fusion-${visual.id}`}>
                          <CardContent className="p-0">
                            <img
                              src={visual.imageUrl || undefined}
                              alt="Fusion visual"
                              className="w-full h-48 object-cover rounded-t-md"
                            />
                            <div className="p-4 space-y-3">
                              {visual.prompt && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {visual.prompt}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage 
                                      src={(visual as any).creatorPhoto || undefined} 
                                      alt={(visual as any).creatorName || 'Creator'} 
                                    />
                                    <AvatarFallback>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground" data-testid={`text-creator-${visual.id}`}>
                                    {(visual as any).creatorName || (visual as any).creatorEmail || 'Unknown'}
                                  </span>
                                </div>
                                {visual.createdAt && (
                                  <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${visual.id}`}>
                                    {new Date(visual.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No fusion visuals created yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brandkit" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate BrandKit</CardTitle>
                <CardDescription>AI-powered brand guidelines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <Input
                    id="brand-name"
                    placeholder="Enter brand name"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    data-testid="input-brand-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology, Fashion, Food"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    data-testid="input-industry"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-description">Brand Description</Label>
                  <Textarea
                    id="brand-description"
                    placeholder="Describe your brand, values, and target market..."
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    rows={6}
                    data-testid="input-brand-description"
                  />
                </div>
                <Button
                  onClick={handleGenerateBrandKit}
                  disabled={generateBrandKitMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-brandkit"
                >
                  {generateBrandKitMutation.isPending ? "Generating..." : "Generate BrandKit"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>BrandKit Summary</CardTitle>
                <CardDescription>Your brand guidelines</CardDescription>
              </CardHeader>
              <CardContent>
                {project.brandKit ? (
                  <div className="space-y-4">
                    {project.brandKit.brandName && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Brand Name</Label>
                        <p className="font-semibold">{project.brandKit.brandName}</p>
                      </div>
                    )}
                    {project.brandKit.tagline && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Tagline</Label>
                        <p>{project.brandKit.tagline}</p>
                      </div>
                    )}
                    {project.brandKit.tone && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Brand Tone</Label>
                        <p className="capitalize">{project.brandKit.tone}</p>
                      </div>
                    )}
                    {project.brandKit.colors && project.brandKit.colors.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Brand Colors</Label>
                        <div className="flex gap-2 flex-wrap">
                          {project.brandKit.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-12 h-12 rounded-md border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No BrandKit generated yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="promo-video" className="space-y-6">
          <PromoVideoTab projectId={params?.id ?? ""} visuals={visuals} />
        </TabsContent>

        <TabsContent value="image2image" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transform Your Images</CardTitle>
                <CardDescription>Apply AI-powered style transformations to your images</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Upload Image for Transformation */}
                <div className="space-y-2">
                  <Label htmlFor="upload-image-transform">1. Upload Image (JPG or PNG, max 10MB)</Label>
                  {uploadedImageForTransform ? (
                    <div className="mt-2 relative border rounded-md p-4">
                      <img 
                        src={uploadedImageForTransform} 
                        alt="Uploaded for transformation" 
                        className="w-full h-32 object-contain rounded-md"
                      />
                      <button
                        onClick={() => setUploadedImageForTransform("")}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        data-testid="button-remove-transform-image"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setUploadedImageForTransform(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="upload-transform-image"
                        data-testid="input-upload-transform-image"
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('upload-transform-image')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>
                      <Input
                        type="text"
                        placeholder="Paste image URL (e.g., https://h5.arriival.com/test.jpg)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            setUploadedImageForTransform(e.currentTarget.value);
                          }
                        }}
                        onBlur={(e) => {
                          if (e.currentTarget.value) {
                            setUploadedImageForTransform(e.currentTarget.value);
                          }
                        }}
                        data-testid="input-transform-image-url"
                      />
                    </div>
                  )}
                </div>

                <Image2ImageMode 
                  projectId={params?.id ?? ""} 
                  uploadedImage={uploadedImageForTransform}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Visuals</CardTitle>
                <CardDescription>Your transformed images and videos (latest highlighted)</CardDescription>
              </CardHeader>
              <CardContent>
                {visuals && visuals.filter((v) => v.type === "generated" || v.type === "image2image" || v.type === "quickclip").length > 0 ? (
                  <div className="flex gap-4 flex-wrap pb-4">
                    {visuals
                      .filter((v) => v.type === "generated" || v.type === "image2image" || v.type === "quickclip")
                      .reverse()
                      .map((visual, index) => (
                        <Card 
                          key={visual.id} 
                          data-testid={`card-visual-${visual.id}`}
                          className={`w-full max-w-[16rem] flex-1 cursor-pointer transition-all ${
                            index === 0 ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                          }`}
                        >
                          <CardContent className="p-0">
                            {visual.mediaType === "video" ? (
                              <div className="relative group">
                                <video
                                  src={visual.videoUrl || ""}
                                  controls
                                  className="w-full h-48 object-cover rounded-t-md bg-black"
                                  data-testid={`video-${visual.id}`}
                                />
                                <a
                                  href={visual.videoUrl || ""}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-download-video-${visual.id}`}
                                >
                                  <Button size="icon" variant="secondary">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                              </div>
                            ) : (
                              <img
                                src={visual.imageUrl || undefined}
                                alt={visual.prompt || "Generated visual"}
                                className="w-full h-48 object-cover rounded-t-md"
                              />
                            )}
                            <div className="p-3 space-y-2">
                              {index === 0 && (
                                <Badge className="mb-2">Latest</Badge>
                              )}
                              {visual.type === "quickclip" && (
                                <Badge variant="outline" className="mb-2">QuickClip Video</Badge>
                              )}
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {visual.prompt || visual.type === "quickclip" ? "QuickClip video generated" : "No prompt"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No visuals generated yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}