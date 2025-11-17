import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Image as ImageIcon, FileText, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import type { Project, UsageStats } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/stats"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Extract first name from display name or use fallback
  const getGreeting = () => {
    if (!user?.displayName) {
      return "Hi there!";
    }
    // Get first name (first word of display name)
    const firstName = user.displayName.split(' ')[0];
    return `Hi ${firstName}, welcome back!`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-dashboard-greeting">
            {getGreeting()}
          </p>
        </div>
        <Button asChild size="lg" data-testid="button-new-project">
          <Link href="/project/new">
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-projects">
                {stats?.totalProjects || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visuals Generated</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-visuals">
                {stats?.totalVisuals || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">AI-powered images</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Pieces</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-content">
                {stats?.totalTextContent || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ad copy & summaries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-api-calls">
                {stats?.apiCallsThisMonth || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <Button variant="ghost" asChild data-testid="link-view-all-projects">
            <Link href="/projects">View All</Link>
          </Button>
        </div>

        {projectsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <Card 
                key={project.id} 
                className="hover-elevate cursor-pointer transition-all"
                data-testid={`card-project-${project.id}`}
              >
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
                  <CardContent>
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
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Create your first project to start generating amazing content
              </p>
              <Button asChild data-testid="button-create-first-project">
                <Link href="/project/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-quick-action-generate">
            <Link href="/project/new">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Wand2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Generate Content</CardTitle>
                <CardDescription>
                  Create AI-powered ad copy and visuals
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-quick-action-fusion">
            <Link href="/project/new?tab=fusion">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Fusion Visual</CardTitle>
                <CardDescription>
                  Combine product photos with AI backgrounds
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-quick-action-brandkit">
            <Link href="/project/new?tab=brandkit">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">BrandKit Summary</CardTitle>
                <CardDescription>
                  Generate brand guidelines with AI
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Wand2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M10 2v2" />
      <path d="M7 8H3" />
      <path d="M21 16h-4" />
      <path d="M11 3H9" />
    </svg>
  );
}
