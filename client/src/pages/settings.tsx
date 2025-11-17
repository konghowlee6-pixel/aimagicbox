import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, XCircle, TrendingUp, Zap, LogOut, AlertTriangle, Save, Loader2, Camera, User, Trash2, MessageSquare, Send, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import type { UsageStats, ApiUsage } from "@shared/schema";

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/settings/:tab?");
  const currentTab = params?.tab || "api";
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<string>("bug");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackEmail, setFeedbackEmail] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Clear feedback notification when visiting feedback tab
  useEffect(() => {
    if (currentTab === "feedback") {
      localStorage.removeItem("hasNewFeedbackMessages");
      // Dispatch custom event to notify sidebar
      window.dispatchEvent(new Event("feedbackRead"));
    }
  }, [currentTab]);

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return "?";
    if (user.displayName) {
      const names = user.displayName.trim().split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  // Sync displayName state when user changes
  useEffect(() => {
    setDisplayName(user?.displayName || "");
  }, [user?.displayName]);

  // Handle profile image upload
  const handleAvatarClick = () => {
    console.log("🖼️ Avatar clicked, triggering file input");
    console.log("🖼️ File input ref:", fileInputRef.current);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📁 File input changed, files:", e.target.files);
    const file = e.target.files?.[0];
    if (!file) {
      console.log("❌ No file selected");
      return;
    }
    console.log("✅ File selected:", file.name, file.type, file.size, "bytes");

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPG or PNG image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Read file as data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read the image file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingPhoto(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        try {
          // Upload to backend
          const response = await apiRequest<{ url: string }>("POST", "/api/upload-profile-image", {
            imageData: base64Image,
          });

          console.log('✅ Profile image uploaded:', response.url);

          // Refresh user data to get updated photoURL from server
          await refreshUser();
          
          console.log('✅ User data refreshed after avatar upload');

          toast({
            title: "Success",
            description: "Profile picture updated successfully!",
          });
        } catch (error: any) {
          console.error("Error uploading profile image:", error);
          toast({
            title: "Upload Failed",
            description: error.message || "Failed to upload profile image. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingPhoto(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to process the cropped image",
          variant: "destructive",
        });
        setIsUploadingPhoto(false);
      };

      reader.readAsDataURL(croppedBlob);
    } catch (error: any) {
      console.error("Error processing image:", error);
      toast({
        title: "Error",
        description: "Failed to process the image",
        variant: "destructive",
      });
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingPhoto(true);
    try {
      // Remove profile picture via API
      await apiRequest("POST", "/api/remove-profile-image", {});

      // Refresh user data from server
      await refreshUser();

      toast({
        title: "Success",
        description: "Profile picture removed. Your initials will be displayed instead.",
      });
    } catch (error: any) {
      console.error("Error removing profile image:", error);
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove profile image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/stats"],
  });

  const { data: usageHistory, isLoading: historyLoading } = useQuery<ApiUsage[]>({
    queryKey: ["/api/usage/history"],
  });

  // Aggregate usage data for chart
  const chartData = usageHistory
    ? usageHistory.reduce((acc: any[], usage) => {
        const date = new Date(usage.timestamp).toLocaleDateString();
        const existing = acc.find((d) => d.date === date);
        if (existing) {
          existing.calls += 1;
          existing.cost += usage.cost || 0;
        } else {
          acc.push({ date, calls: 1, cost: usage.cost || 0 });
        }
        return acc;
      }, [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your API connections and view usage analytics
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => setLocation(`/settings/${value}`)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="api" data-testid="tab-api">
            API Connection
          </TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">
            Usage & Analytics
          </TabsTrigger>
          <TabsTrigger value="account" data-testid="tab-account">
            Account
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            Feedback & Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Status</CardTitle>
              <CardDescription>Check your AI service connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Google Gemini API</p>
                    <p className="text-sm text-muted-foreground">Text & Image Generation</p>
                  </div>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Firebase Authentication</p>
                    <p className="text-sm text-muted-foreground">User Management</p>
                  </div>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-api-calls-month">
                    {stats?.apiCallsThisMonth || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-tokens-used">
                    {stats?.tokensUsedThisMonth?.toLocaleString() || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Total tokens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-cost-month">
                    ${((stats?.costThisMonth || 0) / 100).toFixed(2)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
              <CardDescription>API calls and costs per day</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorCalls)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No usage data available yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Breakdown</CardTitle>
              <CardDescription>API calls by endpoint type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Text Generation", count: stats?.totalTextContent || 0, color: "bg-chart-1" },
                  { name: "Image Generation", count: stats?.totalVisuals || 0, color: "bg-chart-2" },
                  { name: "Fusion Visuals", count: 0, color: "bg-chart-3" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium" data-testid={`text-usage-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feedback & Support Call-to-Action */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Feedback & Support</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Help us improve AI MagicBox! Share your feedback, report bugs, or ask questions.
                  </p>
                  <Button 
                    onClick={() => setLocation("/settings/feedback")}
                    data-testid="button-go-to-feedback"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Go to Feedback & Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <div 
                  className="relative"
                  onMouseEnter={() => setIsHoveringAvatar(true)}
                  onMouseLeave={() => setIsHoveringAvatar(false)}
                >
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Avatar 
                        className="h-24 w-24 cursor-pointer transition-opacity"
                        onClick={handleAvatarClick}
                        data-testid="avatar-profile-picture"
                      >
                        <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Profile"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to upload your profile picture</p>
                    </TooltipContent>
                  </UITooltip>

                  {/* Hover Overlay with Change Button */}
                  {isHoveringAvatar && !isUploadingPhoto && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer transition-opacity"
                      onClick={handleAvatarClick}
                      data-testid="overlay-change-avatar"
                    >
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="pointer-events-none"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  )}

                  {/* Upload Loading State */}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-sm">Profile Picture</p>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG, max 5MB. Your photo will be cropped to a square.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={isUploadingPhoto}
                      data-testid="button-upload-new-photo"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    {user?.photoURL && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingPhoto}
                        data-testid="button-remove-avatar"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={50}
                    data-testid="input-display-name"
                  />
                  <Button
                    onClick={async () => {
                      const trimmedName = displayName.trim();
                      
                      // Validation
                      if (!trimmedName) {
                        toast({
                          title: "Validation Error",
                          description: "Display name cannot be empty",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (trimmedName.length > 50) {
                        toast({
                          title: "Validation Error",
                          description: "Display name must be 50 characters or less",
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsSavingName(true);
                      try {
                        // Update profile via API
                        await apiRequest("POST", "/api/update-profile", { displayName: trimmedName });
                        
                        // Refresh user data from server
                        await refreshUser();
                        
                        toast({
                          title: "Success",
                          description: "Your name has been updated successfully!",
                        });
                      } catch (error: any) {
                        console.error("Error updating display name:", error);
                        toast({
                          title: "Update Failed",
                          description: error.message || "Failed to update display name. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSavingName(false);
                      }
                    }}
                    disabled={isSavingName || displayName.trim() === (user?.displayName || "")}
                    data-testid="button-save-display-name"
                    className="flex-shrink-0"
                  >
                    {isSavingName ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This name will be displayed across the application
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  placeholder="your@email.com"
                  disabled
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed through Firebase Authentication
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={user?.uid || ""}
                  disabled
                  data-testid="input-user-id"
                  className="font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Account Actions
              </CardTitle>
              <CardDescription>Sign out of your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-muted bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  You can sign out of your account at any time. Your projects and data will be saved and available when you sign back in.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={signOut}
                  data-testid="button-sign-out-settings"
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Feedback & Support
                <Badge variant="outline" className="ml-auto">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All caught up
                </Badge>
              </CardTitle>
              <CardDescription>
                Share your thoughts, report issues, or get help from the AI MagicBox team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!feedbackSubmitted ? (
                <>
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
                      onClick={() => {
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
                            timestamp: new Date().toISOString(),
                          });
                        }, 800);
                      }}
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
                </>
              ) : (
                /* Success Message */
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
                    onClick={() => {
                      setFeedbackSubmitted(false);
                      setFeedbackMessage("");
                      setFeedbackEmail("");
                      setFeedbackType("bug");
                    }}
                    data-testid="button-submit-another-feedback"
                  >
                    Submit Another Feedback
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Avatar Crop Modal */}
      {selectedImageSrc && (
        <AvatarCropModal
          open={cropModalOpen}
          imageSrc={selectedImageSrc}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedImageSrc(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
