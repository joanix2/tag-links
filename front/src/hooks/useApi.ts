import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/config/env";

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const useApi = () => {
  const { token } = useAuth();

  const fetchApi = async (endpoint: string, options: FetchOptions = {}) => {
    const { requiresAuth = true, headers = {}, ...rest } = options;

    const finalHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (requiresAuth && token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: finalHeaders,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return response.json();
  };

  return { fetchApi };
};
