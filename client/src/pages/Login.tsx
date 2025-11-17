import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Autofocus email field on page load
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Call AI MagicBox authentication API
      const response = await fetch("/api/simple-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store the JWT token
      localStorage.setItem("token", data.token);

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="animated-gradient min-h-screen flex items-center justify-center p-4">
      {/* Login Box - Increased Width for Better Footer Layout */}
      <div className="bg-white w-full max-w-[460px] rounded-[20px] p-8 sm:p-10 shadow-2xl">
        {/* Logo with Drop Shadow */}
        <div className="flex justify-center mb-2">
          <div 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            style={{ boxShadow: '0 4px 14px rgba(138, 43, 226, 0.4)' }}
          >
            <span className="text-3xl">✨</span>
          </div>
        </div>

        {/* Title with Slogan */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            AI MagicBox
          </h1>
          <p className="text-gray-600 text-sm">
            Create Stunning Marketing Campaigns with AI
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Login Form - Reduced Spacing */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input with Autofocus and Autocomplete */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="testuser@aimagicbox.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Password Input with Eye Icon and Autocomplete - Consistent Border */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Sign In Button with Loading State */}
          <button
            type="submit"
            disabled={isLoading}
            className="gradient-button w-full py-3 rounded-full text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed mt-5"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer Links - Single Line with Left/Right Alignment */}
        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            onClick={() => window.location.href = "/forgot-password"}
            className="text-gray-600 hover:text-purple-600 transition-colors bg-transparent border-0 outline-none cursor-pointer whitespace-nowrap"
          >
            Forgot Password?
          </button>
          <div className="text-gray-600 whitespace-nowrap">
            Don't have an account?{" "}
            <button
              onClick={() => window.location.href = "/signup"}
              className="text-purple-600 font-semibold hover:text-purple-700 transition-colors bg-transparent border-0 outline-none cursor-pointer"
            >
              Sign Up Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
