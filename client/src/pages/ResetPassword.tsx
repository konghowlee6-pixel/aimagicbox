import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, Key } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");

  // Extract token from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Invalid or missing reset token");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/simple-auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-redirect to login page after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        window.location.href = "/simple-login";
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (success) {
    return (
      <div className="animated-gradient min-h-screen flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[20px] p-8 sm:p-10 shadow-2xl">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              ✅ Password Reset Successful!
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <p className="text-gray-500 text-xs">
              Redirecting to login page in 3 seconds...
            </p>
          </div>

          {/* Back to Login Button */}
          <button
            onClick={() => window.location.href = "/simple-login"}
            className="gradient-button w-full py-3 rounded-full text-white font-semibold text-base"
          >
            Go to Login Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animated-gradient min-h-screen flex items-center justify-center p-4">
      {/* Reset Password Box */}
      <div className="bg-white w-full max-w-md rounded-[20px] p-8 sm:p-10 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
            <Key className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Reset Password
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Enter your new password below.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
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

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="gradient-button w-full py-3 rounded-full text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
                Resetting Password...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = "/"}
            className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
