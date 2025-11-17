import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Info, Sparkles } from "lucide-react";

export type MessageType = "success" | "error" | "warning" | "info";

interface MessageDialogProps {
  open: boolean;
  onClose: () => void;
  type: MessageType;
  title: string;
  message: string;
}

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: "text-green-500",
  error: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
};

const bgGradientMap = {
  success: "from-green-50 to-emerald-50",
  error: "from-red-50 to-rose-50",
  warning: "from-yellow-50 to-amber-50",
  info: "from-blue-50 to-indigo-50",
};

export function MessageDialog({ open, onClose, type, title, message }: MessageDialogProps) {
  const Icon = iconMap[type];
  const iconColor = colorMap[type];
  const bgGradient = bgGradientMap[type];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl">
        {/* Gradient Background Header */}
        <div className={`bg-gradient-to-br ${bgGradient} px-8 pt-8 pb-6 relative overflow-hidden`}>
          {/* Decorative Sparkles */}
          <div className="absolute top-4 right-4 opacity-20">
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-10">
            <Sparkles className="w-6 h-6 text-purple-500" />
          </div>

          {/* Icon and Title */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className={`${iconColor} mb-4 animate-in zoom-in duration-300`}>
              <Icon className="w-16 h-16" strokeWidth={1.5} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                {title}
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        {/* Message Content */}
        <div className="px-8 py-6 bg-white">
          <DialogDescription className="text-center text-gray-600 text-base leading-relaxed mb-6">
            {message}
          </DialogDescription>

          {/* Action Button */}
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy usage
export function useMessageDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: MessageType;
    title: string;
    message: string;
  }>({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showMessage = (type: MessageType, title: string, message: string) => {
    setDialogState({ open: true, type, title, message });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  return {
    dialogState,
    showMessage,
    closeDialog,
    MessageDialogComponent: () => (
      <MessageDialog
        open={dialogState.open}
        onClose={closeDialog}
        type={dialogState.type}
        title={dialogState.title}
        message={dialogState.message}
      />
    ),
  };
}
