import { useState, useRef } from "react";
import { Bug, Lightbulb, HelpCircle, Send, Loader2, CheckCircle2, ImagePlus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

export function FeedbackForm() {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<string>("bug");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackEmail, setFeedbackEmail] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter out files that exceed max count
    const remainingSlots = 3 - uploadedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      toast({
        title: "Maximum Images Exceeded",
        description: `You can only upload up to 3 screenshots. ${files.length - remainingSlots} file(s) were not added.`,
        variant: "destructive",
      });
    }
    
    // Validate each file
    const validatedFiles: UploadedImage[] = [];
    for (const file of filesToAdd) {
      // Check file type
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a valid image. Only JPG and PNG files are allowed.`,
          variant: "destructive",
        });
        continue;
      }
      
      // Check file size (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 5MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        continue;
      }
      
      // Create preview URL
      const preview = URL.createObjectURL(file);
      validatedFiles.push({
        file,
        preview,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    }
    
    setUploadedImages(prev => [...prev, ...validatedFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        // Clean up preview URL
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handleSubmit = () => {
    if (!feedbackMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please describe your feedback before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingFeedback(true);
    
    // Simulate submission (no backend yet)
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSubmitted(true);
      
      // Log feedback data (for development)
      console.log("Feedback submitted:", {
        type: feedbackType,
        message: feedbackMessage,
        email: feedbackEmail || "Not provided",
        screenshots: uploadedImages.length,
        timestamp: new Date().toISOString(),
      });
      
      // Clean up preview URLs
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    }, 800);
  };

  const handleReset = () => {
    setFeedbackSubmitted(false);
    setFeedbackMessage("");
    setFeedbackEmail("");
    setFeedbackType("bug");
    
    // Clean up preview URLs and reset images
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
  };

  if (feedbackSubmitted) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Thank you for your feedback!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our team will review and get back to you if needed.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          data-testid="button-submit-another-feedback"
        >
          Submit Another Feedback
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subtitle */}
      <div className="rounded-lg bg-muted/50 p-4 border">
        <p className="text-sm text-muted-foreground">
          Help us improve Magic Box! Your feedback matters. Please note: this is not a live chat or real-time support system. Our team will review your submission and respond if needed.
        </p>
      </div>

      {/* Feedback Form */}
      <div className="space-y-5">
        {/* Feedback Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="feedback-type" className="text-sm font-medium">
            What type of feedback would you like to share?
          </Label>
          <Select value={feedbackType} onValueChange={setFeedbackType}>
            <SelectTrigger id="feedback-type" data-testid="select-feedback-type">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-destructive" />
                  <span>Report a Bug</span>
                </div>
              </SelectItem>
              <SelectItem value="improvement">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span>Suggest an Improvement</span>
                </div>
              </SelectItem>
              <SelectItem value="question">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  <span>Ask a Question</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="feedback-message" className="text-sm font-medium">
              Describe the issue or suggestion
            </Label>
            <span className={`text-xs ${feedbackMessage.length > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {feedbackMessage.length}/1000
            </span>
          </div>
          <Textarea
            id="feedback-message"
            data-testid="textarea-feedback-message"
            placeholder={
              feedbackType === "bug" 
                ? "Please describe the bug you encountered. Include steps to reproduce it if possible..."
                : feedbackType === "improvement"
                ? "Share your idea! What would you like to see improved or added to Magic Box?"
                : "What would you like to know? Ask us anything about AI MagicBox..."
            }
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value.slice(0, 1000))}
            className="min-h-[150px] resize-none"
            maxLength={1000}
          />
        </div>

        {/* Screenshot Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadedImages.length >= 3}
                  data-testid="button-upload-screenshot"
                  className="gap-2"
                >
                  <ImagePlus className="h-4 w-4" />
                  📷 Upload Screenshot {uploadedImages.length > 0 && `(${uploadedImages.length}/3)`}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Attach screenshot(s) to better illustrate the bug or issue you're reporting.</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-xs text-muted-foreground">
              Optional • JPG/PNG • Max 5MB per image
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            data-testid="input-file-screenshot"
          />

          {/* Image Thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {uploadedImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden bg-slate-50 dark:bg-zinc-800/50"
                  data-testid={`thumbnail-${image.id}`}
                >
                  <img
                    src={image.preview}
                    alt="Screenshot preview"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover-elevate active-elevate-2"
                    data-testid={`button-remove-screenshot-${image.id}`}
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                    {image.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Email */}
        <div className="space-y-2">
          <Label htmlFor="feedback-email" className="text-sm font-medium">
            Your email <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="feedback-email"
            data-testid="input-feedback-email"
            type="email"
            placeholder="your.email@example.com"
            value={feedbackEmail}
            onChange={(e) => setFeedbackEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Provide your email if you'd like us to follow up with you
          </p>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmittingFeedback || !feedbackMessage.trim()}
          data-testid="button-submit-feedback"
          className="w-full"
        >
          {isSubmittingFeedback ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
