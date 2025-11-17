import { QueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getFullUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return API_BASE_URL + url;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const fullUrl = getFullUrl(url);
  
  // Get JWT token from localStorage
  const token = localStorage.getItem('token');
  
  // Merge headers with JWT token if available
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',  // Also include cookies for backward compatibility
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        let url: string;
        if (Array.isArray(queryKey) && queryKey.length > 1) {
          const filtered = queryKey.filter(k => k != null && k !== '');
          url = filtered.join('/').replace(/\/\//g, '/');
        } else {
          url = queryKey[0] as string;
        }
        return fetchWithAuth(url);
      },
      retry: 1,
      staleTime: 5000,
    },
    mutations: {
      retry: 1,
    },
  },
});

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any
): Promise<T> {
  return fetchWithAuth(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
