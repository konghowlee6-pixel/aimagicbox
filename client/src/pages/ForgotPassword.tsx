import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    // Simulate password reset email (replace with actual API call)
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
    }, 1500);
  };

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
              Check Your Email
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              We've sent a password reset link to{" "}
              <span className="font-semibold text-gray-900">{email}</span>
            </p>
            <p className="text-gray-500 text-sm mt-3">
              Please check your inbox and follow the instructions to reset your password.
            </p>
          </div>

          {/* Back to Login Button */}
          <button
            onClick={() => window.location.href = "/"}
            className="gradient-button w-full py-3 rounded-full text-white font-semibold text-base"
          >
            Back to Login
          </button>

          {/* Resend Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setSuccess(false)}
              className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              Didn't receive the email? Resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animated-gradient min-h-screen flex items-center justify-center p-4">
      {/* Forgot Password Box */}
      <div className="bg-white w-full max-w-md rounded-[20px] p-8 sm:p-10 shadow-2xl">
        {/* Back Button */}
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors bg-transparent border-0 outline-none cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Login</span>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
            <Mail className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Forgot Password?
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            No worries! Enter your email address and we'll send you a link to reset your password.
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
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="testuser@aimagicbox.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
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
                Sending Reset Link...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
