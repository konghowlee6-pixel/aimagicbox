import { Upload, Video, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuickClipVideo } from "./useQuickClipVideo";
import { QUICKCLIP_RESOLUTIONS, type ResolutionKey } from "@shared/quickclip-utils";

interface QuickClipPanelProps {
  projectId: string;
}

export function QuickClipPanel({ projectId }: QuickClipPanelProps) {
  const {
    image,
    imageFile,
    imageUrl,
    useUrlInput,
    animationPrompt,
    duration,
    enableMusic,
    resolutionKey,
    numberOfVideos,
    isGenerating,
    isGeneratingPrompt,
    status,
    videoUrl,
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
  } = useQuickClipVideo(projectId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            QuickClip Video Generator
          </CardTitle>
          <CardDescription>
            Create a short video clip from a single image with AI-powered text overlay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Settings: Resolution and Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
            {/* Resolution Selection */}
            <div className="space-y-2">
              <Label htmlFor="resolution-select" className="text-sm font-medium">
                Video Resolution
              </Label>
              <Select
                value={resolutionKey}
                onValueChange={(value) => setResolutionKey(value as ResolutionKey)}
                disabled={isGenerating}
              >
                <SelectTrigger id="resolution-select" data-testid="select-resolution">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {QUICKCLIP_RESOLUTIONS.map((res) => (
                    <SelectItem key={res.key} value={res.key} data-testid={`option-resolution-${res.key}`}>
                      {res.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default: 3:4 (Portrait) - 720p
              </p>
            </div>

            {/* Number of Videos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="number-of-videos" className="text-sm font-medium">
                  Number of Videos
                </Label>
                <span className="text-sm font-medium text-primary">{numberOfVideos}</span>
              </div>
              <Slider
                id="number-of-videos"
                value={[numberOfVideos]}
                onValueChange={([value]) => setNumberOfVideos(value)}
                min={1}
                max={4}
                step={1}
                className="w-full"
                disabled={isGenerating}
                data-testid="slider-number-of-videos"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 video</span>
                <span>4 videos</span>
              </div>
            </div>
          </div>

          {/* Step 1: Upload Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">1. Upload Image</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="use-url-input" className="text-sm text-muted-foreground">
                  Use URL instead
                </Label>
                <Switch
                  id="use-url-input"
                  checked={useUrlInput}
                  onCheckedChange={setUseUrlInput}
                  data-testid="switch-use-url-input"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {useUrlInput 
                ? "Enter an HTTPS image URL for testing"
                : "Upload one image (JPG, PNG, or WebP, max 10MB)"
              }
            </p>
            
            {useUrlInput ? (
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  data-testid="input-image-url"
                  disabled={isGenerating}
                />
                {imageUrl && imageUrl.startsWith('https://') && (
                  <div className="relative rounded-lg border overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="QuickClip Preview" 
                      className="w-full h-auto max-h-[400px] object-contain bg-muted"
                      data-testid="img-url-preview"
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                {!image ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer">
                    <input
                      type="file"
                      id="quickclip-image-upload"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="input-quickclip-image"
                    />
                    <label 
                      htmlFor="quickclip-image-upload" 
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Click to upload image</p>
                        <p className="text-sm text-muted-foreground">JPG, PNG, or WebP (max 10MB)</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-lg border overflow-hidden">
                    <img 
                      src={image} 
                      alt="QuickClip" 
                      className="w-full h-auto max-h-[400px] object-contain bg-muted"
                      data-testid="img-quickclip-preview"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                      data-testid="button-remove-image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 2: Animation Effect Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="animation-prompt" className="text-base font-semibold">
                2. Describe Animation Effect
              </Label>
              {image && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shuffleAnimationPrompt}
                      disabled={isGeneratingPrompt || isGenerating}
                      data-testid="button-shuffle-animation-prompt"
                      className="gap-2 flex-shrink-0"
                    >
                      <Wand2 className="h-4 w-4" />
                      {isGeneratingPrompt ? "Generating..." : "Magic Wand"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Shuffle animation ideas – Click to get a new suggested animation prompt for your video.</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Describe the animation effect for your clip (e.g., slow dissolve, zoom out, cinematic reveal). AI will auto-generate on upload.
            </p>
            <Textarea
              id="animation-prompt"
              placeholder={isGeneratingPrompt ? "Generating animation prompt with AI..." : "Soft camera zoom out + subtle product sparkle"}
              value={animationPrompt}
              onChange={(e) => setAnimationPrompt(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              disabled={isGeneratingPrompt}
              data-testid="textarea-animation-prompt"
            />
            <p className="text-xs text-muted-foreground text-right">
              {animationPrompt.length}/200 characters
            </p>
          </div>

          {/* Step 3: Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">3. Video Duration</Label>
              <span className="text-sm font-medium text-primary">{duration}s</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Select video length (1.2s to 12s)
            </p>
            <div className="space-y-2">
              <Slider
                value={[duration]}
                onValueChange={([value]) => setDuration(value)}
                min={1.2}
                max={12}
                step={0.1}
                className="w-full"
                data-testid="slider-duration"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1.2s</span>
                <span>5s (default)</span>
                <span>12s</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={duration === 5 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(5)}
                data-testid="button-duration-5s"
              >
                5s
              </Button>
              <Button
                type="button"
                variant={duration === 8 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(8)}
                data-testid="button-duration-8s"
              >
                8s
              </Button>
              <Button
                type="button"
                variant={duration === 10 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(10)}
                data-testid="button-duration-10s"
              >
                10s
              </Button>
            </div>
          </div>

          {/* Step 4: Optional Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">4. Optional Settings</Label>
            
            {/* Music Toggle */}
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="enable-music" className="font-medium">
                  Add Background Music
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generates a music track matching your animation style and video duration
                </p>
              </div>
              <Switch
                id="enable-music"
                checked={enableMusic}
                onCheckedChange={setEnableMusic}
                data-testid="switch-enable-music"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="space-y-3 pt-4">
            {/* Check for image based on input mode */}
            {!useUrlInput && !imageFile && (
              <Alert>
                <AlertDescription>
                  Please upload an image to generate your QuickClip video.
                </AlertDescription>
              </Alert>
            )}
            
            {useUrlInput && !imageUrl.trim() && (
              <Alert>
                <AlertDescription>
                  Please enter an image URL to generate your QuickClip video.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Check for animation prompt only if image exists */}
            {((useUrlInput && imageUrl.trim()) || (!useUrlInput && imageFile)) && !animationPrompt.trim() && (
              <Alert>
                <AlertDescription>
                  Please enter an animation prompt to generate your QuickClip video.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={triggerGeneration}
              disabled={
                (!useUrlInput && !imageFile) || 
                (useUrlInput && !imageUrl.trim()) || 
                !animationPrompt.trim() || 
                isGenerating
              }
              className="w-full"
              size="lg"
              data-testid="button-generate-quickclip"
            >
              <Video className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating QuickClip Video..." : "Generate QuickClip Video"}
            </Button>

            {/* Status Messages */}
            {status === 'uploading' && (
              <Alert className="bg-primary/10 border-primary/20">
                <AlertDescription>
                  Uploading image...
                </AlertDescription>
              </Alert>
            )}
            {status === 'generating' && (
              <Alert className="bg-primary/10 border-primary/20">
                <AlertDescription>
                  Starting video generation...
                </AlertDescription>
              </Alert>
            )}
            {status === 'polling' && (
              <Alert className="bg-primary/10 border-primary/20">
                <AlertDescription>
                  Generating your video... This may take a few minutes. Please wait.
                </AlertDescription>
              </Alert>
            )}
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>
                  Video generation failed. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success Message - Video saved to Generated Visuals */}
      {status === 'complete' && (
        <Alert>
          <AlertDescription className="text-center">
            ✅ Video generated successfully! Check the <strong>Generated Visuals</strong> section on the right to view and download your QuickClip video.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
