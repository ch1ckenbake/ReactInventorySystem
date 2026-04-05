// Backend API helper - centralizes backend URL configuration
export function getBackendUrl(path: string): string {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  return `${backendUrl}${path}`;
}

export async function fetchFromBackend(
  path: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(getBackendUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}
