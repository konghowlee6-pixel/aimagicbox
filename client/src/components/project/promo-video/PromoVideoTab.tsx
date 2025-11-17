import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Zap, FileVideo } from "lucide-react";
import { QuickClipPanel } from "./QuickClipPanel";
import { PromoVideoGeneratorPanel } from "./PromoVideoGeneratorPanel";
import type { Visual } from "@shared/schema";

interface VideoMakerTabProps {
  projectId: string;
  visuals?: Visual[];
}

// Video Maker Tab: Toggle between QuickClip and PromoVideo Generator
function VideoMakerTab({ projectId, visuals }: VideoMakerTabProps) {
  const [mode, setMode] = useState<"quickclip" | "promo">("quickclip");

  return (
    <div className="space-y-6">
      {/* Toggle for QuickClip vs PromoVideo */}
      <div className="flex justify-center">
        <ToggleGroup 
          type="single" 
          value={mode} 
          onValueChange={(value) => {
            if (value) setMode(value as "quickclip" | "promo");
          }}
          className="inline-flex gap-2 p-1 border rounded-lg bg-muted/30"
          data-testid="toggle-video-mode"
        >
          <ToggleGroupItem 
            value="quickclip" 
            className="flex items-center gap-2 px-6 py-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            data-testid="toggle-quickclip"
          >
            <Zap className="h-4 w-4" />
            <div className="text-left">
              <div className="font-semibold">QuickClip Video</div>
              <div className="text-xs opacity-80">1 image, fast & simple</div>
            </div>
          </ToggleGroupItem>
          
          <ToggleGroupItem 
            value="promo" 
            className="flex items-center gap-2 px-6 py-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            data-testid="toggle-promo"
          >
            <FileVideo className="h-4 w-4" />
            <div className="text-left">
              <div className="font-semibold">PromoVideo Generator</div>
              <div className="text-xs opacity-80">3-5 scenes, professional</div>
            </div>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Conditional rendering based on mode */}
      {mode === "quickclip" ? (
        <QuickClipPanel projectId={projectId} />
      ) : (
        <PromoVideoGeneratorPanel projectId={projectId} visuals={visuals} />
      )}
    </div>
  );
}

// Export as PromoVideoTab for backward compatibility
export { VideoMakerTab as PromoVideoTab };
