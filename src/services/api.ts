// Backend API helper - centralizes backend URL configuration
export function getBackendUrl(path: string): string {
  // For development: use vite proxy via /api
  // For production: use full URL
  if (import.meta.env.DEV) {
    // During dev, vite proxies /api to localhost:3000
    return `/api${path}`;
  }
  
  // Production: use the backend URL from env, or fall back to current origin
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  return `${backendUrl}${path}`;
}

export async function fetchFromBackend(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = getBackendUrl(path);
  console.log('[API] Fetching:', url);
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}
