import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { API_URL, API_ENDPOINTS } from "@/config/env";

export type User = {
  id: string;
  username: string;
  email?: string;
  is_active: boolean;
  tag_match_mode?: "OR" | "AND";
  profile_picture?: string;
  theme?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, email?: string, full_name?: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Apply theme when user changes
  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute("data-theme", user.theme);
    }
  }, [user?.theme]);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH_ME}`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(storedToken);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        } catch (error) {
          console.error("Failed to load user:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const signIn = async (username: string, password: string) => {
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH_LOGIN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Login failed");
      }

      const data = await response.json();
      const accessToken = data.access_token;

      localStorage.setItem("token", accessToken);
      setToken(accessToken);

      const userResponse = await fetch(`${API_URL}${API_ENDPOINTS.AUTH_ME}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);

        // Initialize system tags (Favoris, Partage) if they don't exist
        try {
          await fetch(`${API_URL}/tags/initialize-system-tags`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          // Initialize document type tags if they don't exist
          await fetch(`${API_URL}/tags/initialize-document-types`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          // Migrate existing tags to system tags if needed
          await fetch(`${API_URL}/tags/migrate-system-tags`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
        } catch (initError) {
          console.error("Failed to initialize tags:", initError);
          // Don't block login if initialization fails
        }

        toast({
          title: "Login successful",
          description: `Welcome back, ${userData.username}!`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (username: string, password: string, email?: string, full_name?: string) => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH_REGISTER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, email, full_name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Registration failed");
      }

      await signIn(username, password);

      toast({
        title: "Registration successful",
        description: "Your account has been created!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const refreshUser = async () => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH_ME}`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
