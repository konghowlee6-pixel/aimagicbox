import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Eye, Search, Sparkles, ArrowLeft, Home, ChevronRight, Share2, ArrowUp, Loader2 } from 'lucide-react';
import { COMMUNITY_CATEGORIES, PROJECT_SIZES } from '@/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollPosition } from '@/hooks/use-scroll-position';


interface PublicProject {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  size: string;
  canvasRatio: string; // e.g., "1:1", "3:4", "16:9", "9:16" for dynamic card layouts
  thumbnailUrl: string | null;
  publicVisualUrl: string | null;
  publicVisualId: string | null;
  language: string;
  category: string | null;
  viewCount: number;
  likeCount: number;
  ownerName: string;
  ownerPhoto: string | null;
  createdAt: string;
  updatedAt: string; // Used as "Date Published"
}

export default function CommunityShowcase() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<PublicProject | null>(null);
  const [likedProjects, setLikedProjects] = useState<Set<string>>(new Set());
  const [duplicatingProjectId, setDuplicatingProjectId] = useState<string | null>(null);
  
  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Back to top button visibility
  const showBackToTop = useScrollPosition(500);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch public projects with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['/api/community/projects', { category: selectedCategory, size: selectedSize, sort: sortBy, search: debouncedSearch }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSize) params.append('size', selectedSize);
      if (sortBy) params.append('sort', sortBy);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (pageParam) params.append('cursor', pageParam);
      
      const query = params.toString();
      const url = `/api/community/projects${query ? `?${query}` : ''}`;
      
      const response = await fetch(url, {
        headers: user ? {
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
          'x-user-name': user.displayName || '',
          'x-user-photo': user.photoURL || '',
        } : {},
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });
  
  // Flatten pages into single array of projects
  const projects = data?.pages.flatMap(page => page.items) ?? [];

  // Fetch user's liked projects
  const { data: likedData } = useQuery<{ likedProjectIds: string[] }>({
    queryKey: ['/api/user/liked-projects'],
    queryFn: async () => {
      if (!user) return { likedProjectIds: [] };
      
      const response = await fetch('/api/user/liked-projects', {
        headers: {
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
          'x-user-name': user.displayName || '',
          'x-user-photo': user.photoURL || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch liked projects');
      }
      
      return response.json();
    },
    enabled: !!user,
  });

  // Update liked projects state when data is fetched
  useEffect(() => {
    if (likedData?.likedProjectIds) {
      setLikedProjects(new Set(likedData.likedProjectIds));
    }
  }, [likedData]);
  
  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || isLoading) return;
    
    // Create observer with 400px root margin for mobile (as per architect recommendation)
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: '400px', // Trigger 400px before reaching sentinel
      }
    );
    
    observerRef.current.observe(sentinelRef.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isLoading]);
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Like/unlike mutation with optimistic UI (updated for infinite query)
  const likeMutation = useMutation({
    mutationFn: async ({ projectId, isLiked }: { projectId: string; isLiked: boolean }) => {
      if (isLiked) {
        await apiRequest('DELETE', `/api/projects/${projectId}/like`);
      } else {
        await apiRequest('POST', `/api/projects/${projectId}/like`);
      }
    },
    onMutate: async ({ projectId, isLiked }) => {
      // Cancel outgoing refetches
      const queryKey = ['/api/community/projects', { category: selectedCategory, size: selectedSize, sort: sortBy, search: debouncedSearch }];
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically update liked state
      const newLiked = new Set(likedProjects);
      if (isLiked) {
        newLiked.delete(projectId);
      } else {
        newLiked.add(projectId);
      }
      setLikedProjects(newLiked);
      
      // Optimistically update like count in infinite query cache
      queryClient.setQueryData<any>(queryKey, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((project: PublicProject) =>
              project.id === projectId
                ? { ...project, likeCount: project.likeCount + (isLiked ? -1 : 1) }
                : project
            ),
          })),
        };
      });
      
      return { previousData };
    },
    onError: (err, { projectId, isLiked }, context) => {
      // Revert on error
      const queryKey = ['/api/community/projects', { category: selectedCategory, size: selectedSize, sort: sortBy, search: debouncedSearch }];
      queryClient.setQueryData(queryKey, context?.previousData);
      
      const newLiked = new Set(likedProjects);
      if (isLiked) {
        newLiked.add(projectId);
      } else {
        newLiked.delete(projectId);
      }
      setLikedProjects(newLiked);
      
      toast({
        title: 'Failed to update like',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch in background to ensure sync
      queryClient.invalidateQueries({ queryKey: ['/api/community/projects'] });
    },
  });

  // Duplicate project mutation (for "Use This Design")
  const duplicateMutation = useMutation({
    mutationFn: async (projectId: string) => {
      setDuplicatingProjectId(projectId);
      const response = await apiRequest<{ projectId: string; brandKitApplied: boolean }>('POST', `/api/community/projects/${projectId}/duplicate`);
      return response;
    },
    onSuccess: async (data) => {
      // First success toast
      toast({
        title: 'Your design has been saved to My Projects',
        description: data.brandKitApplied 
          ? 'Your Brand Kit has been automatically applied.' 
          : 'Project duplicated successfully.',
      });
      
      setDuplicatingProjectId(null);
      
      // Invalidate and refetch queries to ensure fresh data appears immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      await queryClient.refetchQueries({ queryKey: ['/api/projects'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Show follow-up tip toast after a delay, then navigate
      setTimeout(() => {
        toast({
          title: 'Tip',
          description: 'After saving a Community design, please refresh the page to reflect your latest changes.',
          duration: 6000,
        });
        
        // Navigate to Desktop after showing the tip
        setTimeout(() => {
          setLocation('/');
        }, 500);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Duplicate Design',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
      setDuplicatingProjectId(null);
    },
  });

  const handleLike = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to like projects');
      return;
    }
    const isLiked = likedProjects.has(projectId);
    likeMutation.mutate({ projectId, isLiked });
  };

  const handleUseDesign = (projectId: string) => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to use Community designs.',
        variant: 'destructive',
      });
      return;
    }
    
    duplicateMutation.mutate(projectId);
  };

  const handleViewProject = async (project: PublicProject) => {
    setSelectedProject(project);
    
    // Increment view count
    try {
      await apiRequest('POST', `/api/projects/${project.id}/view`);
      queryClient.invalidateQueries({ queryKey: ['/api/community/projects'] });
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  };

  const getProjectSizeLabel = (size: string) => {
    return PROJECT_SIZES.find(s => s.size === size)?.label || size;
  };

  const getCanvasRatio = (size: string) => {
    // Convert size like "1080x1080" to ratio like "1:1"
    const [width, height] = size.split('x').map(Number);
    if (!width || !height) return size;
    
    // Find GCD to simplify ratio
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;
    
    return `${ratioW}:${ratioH}`;
  };

  const getInitials = (name: string) => {
    if (!name || name === 'User') return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAspectRatioClass = (canvasRatio: string) => {
    // Return Tailwind aspect ratio class based on canvas ratio from API
    switch (canvasRatio) {
      case '1:1':
        return 'aspect-square'; // Square 1:1
      case '3:4':
        return 'aspect-[3/4]'; // Portrait 3:4
      case '4:3':
        return 'aspect-[4/3]'; // Landscape 4:3
      case '2:3':
        return 'aspect-[2/3]'; // Portrait 2:3
      case '3:2':
        return 'aspect-[3/2]'; // Landscape 3:2
      case '16:9':
        return 'aspect-video'; // Landscape 16:9
      case '9:16':
        return 'aspect-[9/16]'; // Vertical/Story 9:16
      default:
        return 'aspect-square'; // Fallback to square
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-950 dark:to-blue-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 mb-4" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1" data-testid="link-breadcrumb-home">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 dark:text-white font-medium">Community</span>
        </nav>

        {/* Back Button & Header */}
        <div className="mb-8">
          <Link href="/" data-testid="link-back-to-projects">
            <Button variant="ghost" className="mb-4 -ml-2 hover-elevate active-elevate-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Projects
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Community Creations
            </h1>
            <p className="text-slate-600 dark:text-zinc-400 text-base sm:text-lg">
              Browse and use public designs shared by the community.
            </p>
          </div>
        </div>

        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-50 bg-gradient-to-br from-slate-50/95 to-blue-50/95 dark:from-zinc-950/95 dark:to-blue-950/95 backdrop-blur-md shadow-md pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 will-change-transform">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 pt-6">
            {/* Category Filter */}
            <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
              <SelectTrigger data-testid="select-category" className="w-full md:w-64">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {COMMUNITY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Size Filter */}
            <Select value={selectedSize || "all"} onValueChange={(value) => setSelectedSize(value === "all" ? "" : value)}>
              <SelectTrigger data-testid="select-size" className="w-full md:w-64">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {PROJECT_SIZES.map((size) => (
                  <SelectItem key={size.size} value={size.size}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort By Filter */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="select-sort" className="w-full md:w-64">
                <SelectValue placeholder="Sort by: Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <Input
              data-testid="input-search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-slate-200 dark:bg-zinc-700 rounded-t-lg" />
                <CardHeader>
                  <div className="h-6 bg-slate-200 dark:bg-zinc-700 rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 dark:bg-zinc-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-6 text-blue-400 dark:text-blue-500" />
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {searchQuery || selectedCategory || selectedSize
                ? 'No designs match your filters'
                : 'No community designs yet'}
            </h3>
            <p className="text-slate-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              {searchQuery || selectedCategory || selectedSize
                ? 'Try adjusting your search criteria or clearing filters to see more designs.'
                : 'Be the first to inspire others! Share your amazing creations with the community and help fellow designers discover new possibilities.'}
            </p>
            
            {!searchQuery && !selectedCategory && !selectedSize && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Link href="/" data-testid="link-empty-back-to-projects">
                  <Button variant="outline" className="w-full sm:w-auto min-w-[180px]">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to My Projects
                  </Button>
                </Link>
                <Link href="/" data-testid="link-empty-share-design">
                  <Button className="w-full sm:w-auto min-w-[180px] bg-blue-600 hover:bg-blue-700 text-white">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Your Design
                  </Button>
                </Link>
              </div>
            )}
            
            {(searchQuery || selectedCategory || selectedSize) && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedSize('');
                }}
                variant="outline"
                data-testid="button-clear-filters"
              >
                Clear All Filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {projects.map((project) => (
              <Card
                key={project.id}
                data-testid={`card-project-${project.id}`}
                className="overflow-hidden flex flex-col h-auto"
              >
                {/* Project Thumbnail - Full Rendered Canvas (Text, Logo, Layout, All Elements) */}
                <div 
                  className={`relative bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-700 dark:to-zinc-800 cursor-pointer overflow-hidden hover-elevate active-elevate-2 ${getAspectRatioClass(project.canvasRatio)}`}
                  onClick={() => handleViewProject(project)}
                >
                  {project.publicVisualUrl ? (
                    <img
                      src={project.publicVisualUrl}
                      alt={project.name}
                      className="w-full h-full object-contain block"
                      loading="lazy"
                      decoding="async"
                      data-testid={`img-design-${project.id}`}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Sparkles className="w-12 h-12 text-slate-400 dark:text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Project Info - Two Row Layout */}
                <CardContent className="pt-4 pb-4 space-y-3 flex-1">
                  {/* Row 1: Avatar, Username·Date, Canvas Size */}
                  <div className="flex items-center gap-3">
                    {/* Avatar (non-clickable) */}
                    <Avatar className="w-8 h-8 flex-shrink-0" data-testid={`avatar-creator-${project.id}`}>
                      <AvatarImage src={project.ownerPhoto || undefined} alt={project.ownerName} />
                      <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {getInitials(project.ownerName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Username */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate" data-testid={`text-creator-name-${project.id}`}>
                        {project.ownerName}
                      </p>
                    </div>

                    {/* Canvas Size */}
                    <Badge 
                      variant="secondary" 
                      className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs flex-shrink-0"
                      data-testid={`badge-canvas-size-${project.id}`}
                    >
                      {getCanvasRatio(project.size)}
                    </Badge>
                  </div>

                  {/* Row 2: Single Action Row - Clickable Heart + Use Design Button */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Clickable Heart Icon + Like Count with Tooltip */}
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(project.id, e);
                            }}
                            className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer hover-elevate active-elevate-2 rounded-md px-2 py-1"
                            data-testid={`button-like-${project.id}`}
                          >
                            <Heart 
                              className={`w-4 h-4 ${likedProjects.has(project.id) ? 'fill-red-500 text-red-500' : ''}`} 
                            />
                            <span data-testid={`text-like-count-${project.id}`}>{project.likeCount}</span>
                          </button>
                        </TooltipTrigger>
                        {!likedProjects.has(project.id) && (
                          <TooltipContent>
                            <p>Like this project</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    {/* Right: Use This Design Button */}
                    <Button
                      size="sm"
                      data-testid={`button-use-design-${project.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseDesign(project.id);
                      }}
                      disabled={duplicatingProjectId === project.id}
                    >
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      {duplicatingProjectId === project.id ? 'Duplicating...' : 'Use This Design'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Infinite Scroll Sentinel and Loading Indicator */}
        {!isLoading && projects.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {isFetchingNextPage ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-slate-600 dark:text-zinc-400">Loading more designs...</p>
              </div>
            ) : hasNextPage ? (
              <div className="h-4" />
            ) : (
              <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">
                End of results
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-40 transition-all duration-300 hover:scale-110"
          data-testid="button-back-to-top"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}

      {/* Project Detail Modal - Simplified Layout */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedProject?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <div>
              {/* Project Preview - Full Canvas Display */}
              <div className="relative bg-slate-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
                {selectedProject.publicVisualUrl ? (
                  <img
                    src={selectedProject.publicVisualUrl}
                    alt={selectedProject.name}
                    className="max-w-full max-h-[600px] object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <Sparkles className="w-16 h-16 text-slate-400 dark:text-zinc-600" />
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}