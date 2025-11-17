import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  uid: string;
  emailVerified?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {}
});

// Helper function to decode JWT token
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      console.log("🔐 AuthProvider: Checking Auth");
      
      // Check for JWT token in localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log("🔐 ⚠️ No token found in localStorage");
        setUser(null);
        setLoading(false);
        return;
      }

      // Decode the JWT token to get user info
      const decoded = parseJwt(token);
      
      if (!decoded) {
        console.log("🔐 ⚠️ Invalid token");
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if token is expired
      const currentTime = Date.now() / 1000;
      if (decoded.exp && decoded.exp < currentTime) {
        console.log("🔐 ⚠️ Token expired");
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/simple-auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName || data.user.email,
            photoURL: data.user.photoURL || null,
            uid: data.user.id,
            emailVerified: data.user.emailVerified
          };
          console.log("🔐 Auth data:", authUser);
          console.log(`🔐 ✅ User logged in: ${authUser.email}`);
          setUser(authUser);
        } else {
          console.log("🔐 ⚠️ Token verification failed");
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        console.log("🔐 ⚠️ Token verification request failed");
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error("🔐 Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("🔐 setLoading(false) called");
    }
  };

  const handleSignOut = async () => {
    try {
      console.log("🔐 Signing out...");
      
      // Clear token from localStorage
      localStorage.removeItem('token');
      console.log("🔐 Token cleared from localStorage");
      
      setUser(null);
      window.location.href = '/signin';
    } catch (error) {
      console.error("🔐 Sign out error:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    console.log("🔄 Refreshing user data...");
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, signOut: handleSignOut, refreshUser }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    if (import.meta.hot) {
      console.warn("⚠️ AuthContext not ready during HMR, using fallback");
      return {
        user: null,
        loading: true,
        signOut: async () => {},
        refreshUser: async () => {}
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
