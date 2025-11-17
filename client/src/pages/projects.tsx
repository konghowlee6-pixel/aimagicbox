import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Image as ImageIcon, FileText, Calendar, Trash2, Globe2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { Project } from "@shared/schema";

export default function ProjectsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Share project to community mutation
  const shareProjectMutation = useMutation({
    mutationFn: async ({ projectId, imageId, renderedImageUrl }: { projectId: string; imageId: string; renderedImageUrl?: string }) => {
      if (!user) {
        throw new Error("Must be logged in to share projects");
      }
      
      return await apiRequest("PATCH", `/api/projects/${projectId}/public-visual`, {
        imageId,
        renderedImageUrl: renderedImageUrl || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Shared to Community",
        description: "Your project is now visible in the Community gallery.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Share failed",
        description: error.message || "Failed to share project to community.",
        variant: "destructive",
      });
    },
  });

  // Unshare project from community mutation
  const unshareProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!user) {
        throw new Error("Must be logged in to unshare projects");
      }
      
      return await apiRequest("DELETE", `/api/projects/${projectId}/public-visual`);
    },
    onSuccess: () => {
      toast({
        title: "Removed from Community",
        description: "Your project is no longer public.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Unshare failed",
        description: error.message || "Failed to remove project from community.",
        variant: "destructive",
      });
    },
  });

  const handleGlobeClick = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to share projects to the community.",
        variant: "destructive",
      });
      return;
    }

    // If already shared, unshare it
    if (project.publicVisualId) {
      unshareProjectMutation.mutate(project.id);
    } else {
      // Need to share - fetch project's campaign images and share the first image
      try {
        // Fetch project details to get campaigns using apiRequest (includes auth headers)
        const projectData = await apiRequest("GET", `/api/projects/${project.id}`);
        
        // Get the first SAVED campaign image (isSaved = true) with full design
        if (projectData.campaigns && projectData.campaigns.length > 0) {
          // Find first campaign with saved images
          let imageToShare = null;
          for (const campaign of projectData.campaigns) {
            if (campaign.images && campaign.images.length > 0) {
              // CRITICAL: Only share SAVED images with renderedImageUrl (full design canvas)
              const savedImages = campaign.images.filter((img: any) => img.isSaved);
              if (savedImages.length > 0) {
                imageToShare = savedImages[0];
                break;
              }
            }
          }
          
          if (imageToShare) {
            // Upload rendered canvas to object storage for high-quality Community display
            let objectStorageUrl = imageToShare.renderedImageUrl;
            
            // If renderedImageUrl is a base64 data URI, upload it to object storage first
            if (objectStorageUrl && objectStorageUrl.startsWith('data:image/')) {
              try {
                const uploadResponse = await apiRequest("POST", "/api/upload-community-image", {
                  imageData: objectStorageUrl,
                });
                objectStorageUrl = uploadResponse.url;
              } catch (uploadError: any) {
                toast({
                  title: "Upload failed",
                  description: uploadError.message || "Failed to upload image to storage.",
                  variant: "destructive",
                });
                return;
              }
            }
            
            // CRITICAL: NEVER fallback to imageUrl (background only) - ALWAYS use renderedImageUrl (full design)
            if (!objectStorageUrl) {
              toast({
                title: "Cannot share",
                description: "This image needs to be re-saved first. Please open the project, select the image, and click 'Save to My Project' to generate the full design.",
                variant: "destructive",
              });
              return;
            }
            
            shareProjectMutation.mutate({ 
              projectId: project.id, 
              imageId: imageToShare.id,
              renderedImageUrl: objectStorageUrl
            });
            return;
          }
        }
        
        // No images available to share
        toast({
          title: "No visuals available",
          description: "This project doesn't have any saved visuals to share. Please create and save some visuals first.",
          variant: "destructive",
        });
      } catch (error: any) {
        toast({
          title: "Failed to share",
          description: error.message || "Could not fetch project details.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold" data-testid="text-projects-title">
            My Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all your creative campaigns
          </p>
        </div>
        <Button asChild size="lg" data-testid="button-new-project">
          <Link href="/project/new">
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <TooltipProvider>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover-elevate cursor-pointer transition-all group overflow-hidden"
                data-testid={`card-project-${project.id}`}
              >
                {/* Project Thumbnail with Globe Icon */}
                <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-700 dark:to-zinc-800">
                  <Link href={`/project/${project.id}`}>
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-12 h-12 text-slate-400 dark:text-zinc-600" />
                      </div>
                    )}
                  </Link>
                  
                  {/* Globe Icon - Top-Left */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-2 left-2 h-9 w-9 rounded-md bg-background/80 backdrop-blur-sm hover:bg-background/90 ${
                          project.publicVisualId 
                            ? 'text-primary' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={(e) => handleGlobeClick(e, project)}
                        disabled={shareProjectMutation.isPending || unshareProjectMutation.isPending}
                        data-testid={`button-share-${project.id}`}
                      >
                        <Globe2 
                          className="h-5 w-5" 
                          fill={project.publicVisualId ? 'currentColor' : 'none'}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {project.publicVisualId 
                        ? "Shared to Community - Click to unshare" 
                        : "Share to Community"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Link href={`/project/${project.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1">
                          {project.name}
                        </CardTitle>
                        {project.source === 'community' && project.originalCreatorName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            By {project.originalCreatorName}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                        {project.source === 'community' && (
                          <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" data-testid={`badge-community-${project.id}`}>
                            <Users className="h-3 w-3" />
                            Community
                          </Badge>
                        )}
                        {project.brandKit?.brandName && (
                          <Badge variant="secondary" className="flex-shrink-0">
                            {project.brandKit.brandName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" />
                        <span>Visuals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>Content</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: Implement delete
                        }}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Start creating amazing content by launching your first project
            </p>
            <Button asChild size="lg" data-testid="button-create-first-project">
              <Link href="/project/new">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
