import { useState, useEffect } from "react";
import { 
  Home, 
  FolderKanban, 
  Sparkles, 
  Settings, 
  CreditCard,
  LogOut
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useAuth } from "@/lib/auth-context";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "New Project",
    url: "/project/new",
    icon: Sparkles,
  },
  {
    title: "My Projects",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Subscription",
    url: "/subscription",
    icon: CreditCard,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const [hasNewFeedbackMessages, setHasNewFeedbackMessages] = useState(false);

  // Initialize and simulate new feedback messages (dummy for now)
  useEffect(() => {
    // Check localStorage for existing notification state
    const hasNotification = localStorage.getItem("hasNewFeedbackMessages") === "true";
    setHasNewFeedbackMessages(hasNotification);

    // Listen for feedback read event
    const handleFeedbackRead = () => {
      setHasNewFeedbackMessages(false);
    };
    window.addEventListener("feedbackRead", handleFeedbackRead);

    // DEMO: Simulate new message after 5 seconds (remove this in production)
    // This is for demonstration purposes only. In production, this will be triggered
    // by actual backend responses to user feedback.
    const demoTimeout = setTimeout(() => {
      if (!hasNotification) {
        localStorage.setItem("hasNewFeedbackMessages", "true");
        setHasNewFeedbackMessages(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("feedbackRead", handleFeedbackRead);
      clearTimeout(demoTimeout);
    };
  }, []);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-serif font-semibold">
            AI MagicBox
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <div className="relative">
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url || (item.url === "/settings" && location.startsWith("/settings"))}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    
                    {/* Notification Badge for Settings with Tooltip */}
                    {item.title === "Settings" && hasNewFeedbackMessages && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div data-testid="badge-feedback-notification">
                              <NotificationBadge showDot={true} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right"
                            className="bg-zinc-900 text-white border-zinc-700"
                          >
                            <p className="font-medium">You have new messages from the Magic Box team</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={signOut}
          data-testid="button-sign-out"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
