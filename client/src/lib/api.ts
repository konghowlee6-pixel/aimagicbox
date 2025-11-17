// API utility that automatically includes authentication token

export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('authToken');
  
  console.log("🌐 API Request to:", url);
  console.log("🔑 Token from localStorage:", token ? "EXISTS (" + token.substring(0, 20) + "...)" : "NOT FOUND");
  
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log("✅ Authorization header added");
  } else {
    console.warn("⚠️ No token available - request will be unauthenticated");
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Still include cookies for backwards compatibility
  });
}
