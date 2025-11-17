import { useState, useEffect } from 'react';

/**
 * Custom hook to track scroll position
 * Throttles scroll events to animation frame for performance
 * @param threshold - Scroll position in pixels to trigger visibility
 * @returns boolean indicating if scroll position is past threshold
 */
export function useScrollPosition(threshold: number = 500): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          setIsVisible(scrollY > threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Check initial scroll position
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return isVisible;
}
