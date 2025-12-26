/**
 * Application configuration
 * Centralized environment variables and constants
 */

// API Base URL - defaults to localhost if not set
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Other configuration
export const APP_NAME = "Tag Link";
export const APP_VERSION = "1.0.0";

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: "/auth/register",
  AUTH_LOGIN: "/auth/token",
  AUTH_ME: "/auth/me",

  // Users
  USERS: "/users",

  // URLs
  URLS: "/urls",
  URLS_BULK_IMPORT: "/urls/bulk-import",

  // Tags
  TAGS: "/tags",
  TAGS_MERGE: "/tags/merge",

  // Files
  FILES: "/files",
} as const;

// Build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_URL}${endpoint}`;
};

export default {
  API_URL,
  APP_NAME,
  APP_VERSION,
  API_ENDPOINTS,
  buildApiUrl,
};
