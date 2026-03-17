import type { ApiResponse } from "@/services/types";
import { useAuthStore } from "@/stores";

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let url = endpoint;
  if (options.method === undefined || options.method === "GET") {
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${endpoint}${separator}_t=${Date.now()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return { code: 401, message: "Unauthorized" } as ApiResponse<T>;
  }

  const data = await response.json();
  return data as ApiResponse<T>;
}
