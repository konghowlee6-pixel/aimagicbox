
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();

  // If already authenticated via Replit, redirect to dashboard
  if (user && !loading) {
    console.log("✅ User already authenticated via Replit:", user.email);
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("📧 Attempting login with:", email);
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      console.log("✅ Login successful:", data);
      console.log("📦 Response data:", JSON.stringify(data, null, 2));
      
      // Store token in localStorage if provided
      if (data.token) {
        console.log("🔑 Token received:", data.token.substring(0, 20) + "...");
        localStorage.setItem('authToken', data.token);
        console.log("✅ Token stored in localStorage");
        
        // Verify token was stored
        const storedToken = localStorage.getItem('authToken');
        console.log("🔍 Verification - Token in storage:", storedToken ? "YES" : "NO");
        if (storedToken) {
          console.log("🔍 Stored token preview:", storedToken.substring(0, 20) + "...");
        }
      } else {
        console.warn("⚠️ No token in response!");
      }
      
      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });

      // Refresh user data
      await refreshUser();
      
      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      
      // Provide specific, helpful error messages
      let errorTitle = "Login Failed";
      let errorMessage = "Unable to sign in. Please check your credentials and try again.";
      
      if (error.message) {
        // Handle specific error cases
        if (error.message.includes("verify") || error.message.includes("verification")) {
          errorTitle = "Email Not Verified";
          errorMessage = "Please verify your email address before signing in. Check your inbox for the verification link.";
        } else if (error.message.includes("password")) {
          errorTitle = "Incorrect Password";
          errorMessage = "The password you entered is incorrect. Please try again.";
        } else if (error.message.includes("email") || error.message.includes("user")) {
          errorTitle = "Account Not Found";
          errorMessage = "No account found with this email address. Please sign up first.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
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
          <p className="text-base text-gray-600">Welcome back! Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" data-testid="label-email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" data-testid="label-password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                data-testid="input-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
                data-testid="button-toggle-password"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="animated-gradient-button w-full py-3 px-4 rounded-lg hover:shadow-[0_0_25px_rgba(255,79,163,0.5)] hover:scale-[1.02] font-semibold text-white transition-all duration-200"
            disabled={loading}
            data-testid="button-signin"
          >
            {loading ? "Please wait..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log("🔗 Navigating to register page");
                setLocation("/register");
              }}
              className="text-purple-600 hover:text-purple-700 font-semibold hover:underline transition-colors cursor-pointer"
              disabled={loading}
            >
              Sign up here
            </button>
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
