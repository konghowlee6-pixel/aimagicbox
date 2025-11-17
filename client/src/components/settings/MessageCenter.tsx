import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Bell, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  type: "update" | "response" | "warning";
  title: string;
  content: string;
  timestamp: Date | string;
  isRead: boolean;
}

// Sample messages (simulated backend data)
const INITIAL_MESSAGES: Message[] = [
  {
    id: "msg-1",
    type: "update",
    title: "New Feature: Video Maker Tab",
    content: "We've added a new Video Maker tab with QuickClip and PromoVideo generators! Create stunning marketing videos with AI-powered voiceovers and background music. Check it out in your project workspace.",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    isRead: false,
  },
  {
    id: "msg-2",
    type: "response",
    title: "Re: Your feedback about image quality",
    content: "Thank you for your suggestion! We've enhanced our image rendering system to generate ultra high-quality visuals for community sharing. Your feedback helped us improve the platform for everyone.",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    isRead: false,
  },
  {
    id: "msg-3",
    type: "update",
    title: "Community Creations Enhanced",
    content: "We've added infinite scroll and improved performance for the Community Creations page. Browse thousands of designs seamlessly with our new pagination system and sticky filter bar.",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    isRead: false,
  },
];

export function MessageCenter() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('magicBoxMessages');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  // Mark all messages as read when component mounts
  useEffect(() => {
    const hasUnreadMessages = messages.some(msg => !msg.isRead);
    
    if (hasUnreadMessages) {
      const updatedMessages = messages.map(msg => ({ ...msg, isRead: true }));
      setMessages(updatedMessages);
      localStorage.setItem('magicBoxMessages', JSON.stringify(updatedMessages));
      
      // Clear notification badge
      localStorage.removeItem('hasNewFeedbackMessages');
      window.dispatchEvent(new Event('feedbackRead'));
    }
  }, []); // Only run on mount

  const toggleMessage = (id: string) => {
    setExpandedMessageId(expandedMessageId === id ? null : id);
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case "update":
        return <Bell className="h-5 w-5 text-blue-500" />;
      case "response":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatTimestamp = (date: Date | string) => {
    // Convert to Date object if it's a string (from localStorage)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4" data-testid="section-message-center">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Latest Updates from Magic Box Team
        </h3>
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 overflow-hidden"
            data-testid={`message-${message.id}`}
          >
            <button
              onClick={() => toggleMessage(message.id)}
              className="w-full px-4 py-3 flex items-start gap-3 hover-elevate active-elevate-2 text-left"
              data-testid={`button-toggle-message-${message.id}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getMessageIcon(message.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm text-zinc-900 dark:text-white">
                    {message.title}
                  </h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {expandedMessageId === message.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {expandedMessageId !== message.id && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {message.content}
                  </p>
                )}
              </div>
            </button>

            {expandedMessageId === message.id && (
              <div className="px-4 pb-4 pl-16 animate-in slide-in-from-top-2 duration-200">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {message.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
        <p className="text-xs text-muted-foreground text-center">
          Showing latest {messages.length} updates • Check back regularly for new announcements
        </p>
      </div>
    </div>
  );
}
