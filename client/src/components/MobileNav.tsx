import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Menu, X, Handshake, CreditCard, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

interface MobileNavProps {
  onNavigateToSubscription: () => void;
  onNavigateToBrandKit: () => void;
}

export function MobileNav({ onNavigateToSubscription, onNavigateToBrandKit }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleNavigation = (callback: () => void) => {
    setOpen(false);
    setTimeout(() => callback(), 300);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        data-testid="button-mobile-menu"
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setOpen(false)}
          data-testid="mobile-nav-backdrop"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="mobile-nav-drawer"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              data-testid="button-close-mobile-menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 p-4 flex-1">
            <Link
              href="/community"
              onClick={() => setOpen(false)}
            >
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-base hover-elevate"
                data-testid="mobile-nav-community"
              >
                <Handshake className="h-5 w-5" />
                <span>Community</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-base hover-elevate"
              onClick={() => handleNavigation(onNavigateToSubscription)}
              data-testid="mobile-nav-subscription"
            >
              <CreditCard className="h-5 w-5" />
              <span>Subscription</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-base hover-elevate"
              onClick={() => handleNavigation(onNavigateToBrandKit)}
              data-testid="mobile-nav-settings"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Button>

            <div className="border-t border-border my-2" />

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-base hover-elevate"
              onClick={toggleTheme}
              data-testid="mobile-nav-theme-toggle"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-5 w-5" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5" />
                  <span>Dark Mode</span>
                </>
              )}
            </Button>
          </nav>
        </div>
      </div>
    </>
  );
}
