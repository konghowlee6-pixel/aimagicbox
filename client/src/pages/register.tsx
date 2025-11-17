import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Eye, EyeOff, Mail } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Register form submitted", { email, displayName, passwordLength: password.length });
    
    // Validate password match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("📝 Attempting registration with:", email);
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          email, 
          password,
          displayName: displayName || email.split('@')[0]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      console.log("✅ Registration successful:", data);
      
      toast({
        title: "Registration successful! 🎉",
        description: (
          <div className="flex items-start gap-2">
            <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Please check your email</p>
              <p className="text-sm">We've sent a verification link to <strong>{email}</strong>. Click the link to activate your account.</p>
            </div>
          </div>
        ),
        duration: 8000,
      });

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
      
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      console.log("Error details:", { message: error.message, type: typeof error, error });
      
      // Provide specific, helpful error messages
      let errorTitle = "Registration Failed";
      let errorMessage = "Unable to create your account. Please try again.";
      
      if (error.message) {
        // Handle specific error cases
        if (error.message.includes("already exists") || error.message.includes("duplicate")) {
          errorTitle = "Email Already Registered";
          errorMessage = "An account with this email already exists. Please sign in instead or use a different email.";
        } else if (error.message.includes("invalid email")) {
          errorTitle = "Invalid Email";
          errorMessage = "Please enter a valid email address.";
        } else if (error.message.includes("password")) {
          errorTitle = "Invalid Password";
          errorMessage = "Password must be at least 6 characters long.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        } else if (error.message.includes("SMTP") || error.message.includes("email")) {
          errorTitle = "Email Sending Failed";
          errorMessage = "Account created but verification email could not be sent. Please contact support.";
        } else {
          errorMessage = error.message;
        }
      }

      console.log("📢 Showing error toast:", { errorTitle, errorMessage });
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      console.log("✅ Toast called");
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-base text-gray-600">Start Creating Stunning Campaigns with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">Minimum 6 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? (
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
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log("🔗 Navigating to login page");
                setLocation("/login");
              }}
              className="text-purple-600 hover:text-purple-700 font-semibold hover:underline transition-colors cursor-pointer"
              disabled={loading}
            >
              Sign in here
            </button>
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
