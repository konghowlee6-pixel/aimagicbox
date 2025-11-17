import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Info, Paintbrush, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Image2ImageModeProps {
  projectId: string;
  uploadedImage?: string; // Parent-managed upload (optional for backward compatibility)
}

export function Image2ImageMode({ 
  projectId, 
  uploadedImage
}: Image2ImageModeProps) {
  const { toast } = useToast();
  const [transformPrompt, setTransformPrompt] = useState("");
  const [styleStrength, setStyleStrength] = useState<number>(70);
  const [negativePrompt, setNegativePrompt] = useState("");

  const transformMutation = useMutation({
    mutationFn: async (data: {
      projectId: string;
      imageDataUrl: string;
      transformPrompt: string;
      strength: number;
      negativePrompt?: string;
    }) => {
      return await apiRequest("POST", "/api/generate/image2image", data);
    },
    onSuccess: async (data: any) => {
      console.log("✅ Image2Image transformation succeeded!", data);
      console.log("🔄 Invalidating query with key:", ["/api/projects", projectId, "visuals"]);
      
      toast({
        title: "Transformation Complete",
        description: "Your transformed image appears in the Generated Visuals panel!",
      });
      
      // Invalidate visuals query to refresh the right panel (for project.tsx compatibility)
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "visuals"] });
      
      // Also invalidate the full project query to ensure everything refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      
      console.log("✅ Queries invalidated, should refetch now");

      // 🔧 QUICK FIX: Also manually fetch and broadcast event for App.tsx
      // This is a workaround until App.tsx is refactored to use TanStack Query
      try {
        console.log("🔧 Fetching updated visuals for App.tsx state sync...");
        
        // Use apiRequest to ensure proper auth headers
        const visuals = await apiRequest("GET", `/api/projects/${projectId}/visuals`);
        
        console.log("✅ Fetched visuals:", visuals);
        
        // Broadcast custom event for App.tsx to listen to
        window.dispatchEvent(new CustomEvent('visuals-updated', { 
          detail: { projectId, visuals } 
        }));
        
        console.log("✅ Dispatched 'visuals-updated' event for App.tsx");
      } catch (error) {
        console.error("Failed to fetch updated visuals:", error);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Transformation Failed",
        description: error.message || "Failed to transform image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Quick style presets for easy selection
  const stylePresets = [
    "Watercolor",
    "Pencil Sketch",
    "Anime Style",
    "Cartoon",
    "Cinematic",
    "Fantasy Art",
    "Pixel Art",
    "Cyberpunk Style"
  ];

  const handleGenerate = () => {
    if (!uploadedImage) {
      toast({
        title: "Image required",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    // Use user's prompt or fallback to "Oil painting" for testing
    const finalPrompt = transformPrompt.trim() || "Oil painting";

    transformMutation.mutate({
      projectId,
      imageDataUrl: uploadedImage,
      transformPrompt: finalPrompt,
      strength: styleStrength,
      negativePrompt: negativePrompt.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Step 2: Transformation Style */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="transform-prompt">2. Describe the transformation style</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" data-testid="tooltip-transform-prompt" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>
                  Describe how you want the uploaded image to change. Click a style below for quick selection, or write your own custom prompt.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Quick Style Presets */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Quick styles:</span>
          </div>
          {stylePresets.map((style) => (
            <Badge
              key={style}
              variant="outline"
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setTransformPrompt(style)}
              data-testid={`badge-style-${style.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {style}
            </Badge>
          ))}
        </div>

        <Textarea
          id="transform-prompt"
          placeholder='e.g., "Turn this into an oil painting", "Apply watercolor effect", "Make this look like a Pixar scene" (Leave blank for Oil painting default)'
          value={transformPrompt}
          onChange={(e) => setTransformPrompt(e.target.value)}
          rows={3}
          data-testid="input-transform-prompt"
          disabled={transformMutation.isPending}
          className="resize-none"
        />
      </div>

      {/* Step 3: Style Strength */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="style-strength">3. Style Strength</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" data-testid="tooltip-style-strength" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Controls transformation intensity. 0 = Minimal change (preserve original), 70-100 = Strong style transfer (dramatic transformation). Start with 70-80 for visible style changes.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-sm text-muted-foreground font-medium" data-testid="text-strength-value">
            {styleStrength}
          </span>
        </div>
        <Slider
          id="style-strength"
          min={0}
          max={100}
          step={1}
          value={[styleStrength]}
          onValueChange={(values) => setStyleStrength(values[0] ?? styleStrength)}
          disabled={transformMutation.isPending}
          data-testid="slider-style-strength"
          className="w-full"
        />
      </div>

      {/* Step 4: Negative Prompt */}
      <div className="space-y-2">
        <Label htmlFor="negative-prompt-i2i">4. Exclude unwanted elements (Optional)</Label>
        <Textarea
          id="negative-prompt-i2i"
          placeholder="e.g., no blur, no watermark, no distortion"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          rows={2}
          data-testid="input-negative-prompt-i2i"
          disabled={transformMutation.isPending}
          className="resize-none"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={transformMutation.isPending || !uploadedImage || !transformPrompt.trim()}
        className="w-full"
        data-testid="button-generate-image2image"
      >
        {transformMutation.isPending ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating Stylized Image...
          </>
        ) : (
          <>
            <Paintbrush className="h-4 w-4 mr-2" />
            Generate Stylized Image
          </>
        )}
      </Button>
    </div>
  );
}
