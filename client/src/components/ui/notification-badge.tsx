
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count?: number;
  showDot?: boolean;
  className?: string;
}

export function NotificationBadge({ count, showDot = true, className }: NotificationBadgeProps) {
  // If count is provided and > 0, show number badge
  if (count && count > 0) {
    return (
      <div
        className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4D4F] text-white text-[10px] font-bold shadow-lg animate-pulse",
          className
        )}
        style={{
          boxShadow: '0 0 0 2px rgba(255, 77, 79, 0.2)'
        }}
        aria-label={`${count} new notification${count > 1 ? 's' : ''}`}
      >
        {count > 9 ? '9+' : count}
      </div>
    );
  }

  // Otherwise show simple dot if showDot is true
  if (showDot) {
    return (
      <div
        className={cn(
          "absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF4D4F] animate-pulse shadow-lg",
          className
        )}
        style={{
          boxShadow: '0 0 0 2px rgba(255, 77, 79, 0.2)'
        }}
        aria-label="New notification"
      />
    );
  }

  return null;
}
