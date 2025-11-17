
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import Login from '@/pages/Login';
import SignUp from '@/pages/SignUp';
import SimpleLogin from '@/pages/SimpleLogin';
import SimpleRegister from '@/pages/SimpleRegister';
import ForgotPassword from '@/pages/ForgotPassword';
import EmailVerified from '@/pages/EmailVerified';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import App from './App';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Error boundary to catch auth errors gracefully
class AuthErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 Auth Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred with authentication.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inner component that uses the auth context - MUST be inside AuthProvider
const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('🚨 AuthGate rendering NOW');
  console.log('🔐 AuthGate render - user:', user?.email, 'loading:', loading);
  console.log('🔐 Current window.location.pathname:', window.location.pathname);
  console.log('🔐 Current window.location.href:', window.location.href);
  console.log('🔐 URL has auth params?:', window.location.search.includes('apiKey') || window.location.search.includes('mode'));

  // CRITICAL: Always redirect to dashboard after successful login
  // This ensures Google OAuth flow completes properly
  // MUST be before any conditional returns to follow Rules of Hooks
  React.useEffect(() => {
    if (user && (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/register')) {
      console.log('🔄 User logged in, redirecting to dashboard');
      console.log('🔄 Current path:', window.location.pathname);
      
      // Force redirect to dashboard
      setTimeout(() => {
        console.log('✅ Executing redirect to /dashboard');
        window.location.href = '/dashboard';
      }, 100);
    }
  }, [user]);

  

  if (loading) {
    console.log('⏳ Showing loading screen...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading AI MagicBox...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('👤 No user - checking route');
    
    // Simple auth routes
    if (window.location.pathname === '/simple-login') {
      console.log('🔐 Rendering SimpleLogin');
      return <SimpleLogin />;
    }
    if (window.location.pathname === '/register') {
      console.log('📝 Rendering SignUp');
      return <SignUp />;
    }
    if (window.location.pathname === '/signup') {
      console.log('📝 Rendering SignUp');
      return <SignUp />;
    }
    if (window.location.pathname === '/forgot-password') {
      console.log('🔑 Rendering ForgotPassword');
      return <ForgotPassword />;
    }
    if (window.location.pathname === '/verify-email') {
      console.log('✉️ Rendering EmailVerified');
      return <EmailVerified />;
    }
    if (window.location.pathname === '/terms') {
      console.log('📄 Rendering TermsOfService');
      return <TermsOfService />;
    }
    if (window.location.pathname === '/privacy') {
      console.log('🔒 Rendering PrivacyPolicy');
      return <PrivacyPolicy />;
    }
    
    // Default to new login page
    console.log('🔐 Rendering Login (default)');
    return <Login />;
  }

  console.log('✅ User authenticated - checking redirect');
  
  // Show loading state while redirect happens
  if (window.location.pathname === '/' || window.location.pathname === '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  console.log('✅ User exists - rendering App');
  return <App />;
};

// Main wrapper component
const AuthWrapper: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthErrorBoundary>
        <AuthProvider>
          <TooltipProvider>
            <AuthGate />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </AuthErrorBoundary>
    </QueryClientProvider>
  );
};

export default AuthWrapper;
