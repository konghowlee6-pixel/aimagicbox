
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ReplAuthLoginPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already authenticated via Repl Auth
    fetch('/__replauthuser')
      .then(res => res.json())
      .then(user => {
        if (user && user.id) {
          setLocation('/dashboard');
        }
      })
      .catch(() => {
        // Not authenticated, stay on login page
      });
  }, [setLocation]);

  const handleLogin = () => {
    window.addEventListener("message", authComplete);
    
    const h = 500;
    const w = 350;
    const left = screen.width / 2 - w / 2;
    const top = screen.height / 2 - h / 2;

    const authWindow = window.open(
      "https://replit.com/auth_with_repl_site?domain=" + location.host,
      "_blank",
      "modal=yes, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=" + w + ", height=" + h + ", top=" + top + ", left=" + left
    );

    function authComplete(e: MessageEvent) {
      if (e.data !== "auth_complete") return;
      
      window.removeEventListener("message", authComplete);
      authWindow?.close();
      setLocation('/dashboard');
    }
  };

  return (
    <AuthBackground>
      <AuthCard>
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-3xl shadow-lg shadow-pink-500/30">
              ✨
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI MagicBox</h1>
          <p className="text-sm text-gray-600">
            Create stunning marketing campaigns with AI
          </p>
        </div>

        <Button
          onClick={handleLogin}
          className="animated-gradient-button w-full py-3 px-4 rounded-lg hover:shadow-[0_0_25px_rgba(255,79,163,0.5)] hover:scale-[1.02] font-semibold text-white transition-all duration-200"
        >
          Sign in with Replit
        </Button>
      </AuthCard>
    </AuthBackground>
  );
}
