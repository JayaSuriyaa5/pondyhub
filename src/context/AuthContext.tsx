"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, ApiResponse } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
 login: (
  identifier: string,
  password: string
) => Promise<{ success: boolean; error?: string; code?: string; fieldErrors?: Record<string, string[]> }>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const refetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json: ApiResponse<{ user: AuthUser }> = await res.json();
      setUser(json.success ? json.data.user : null);
    } catch {
      setUser(null);
    }
  }, []);

  // Re-sync user state when the tab regains focus, in case the session
  // changed in another tab (e.g. logged out elsewhere).
  useEffect(() => {
    function handleFocus() {
      refetchUser();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const json: ApiResponse<{ user: AuthUser }> = await res.json();

        if (!json.success) {
         return {
  success: false,
  error: json.error.message,
  code: json.error.code,
  fieldErrors: json.error.fieldErrors,
};
        }

        return { success: true };
      } catch {
        return { success: false, error: "Network error. Please try again." };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const json: ApiResponse<{ user: AuthUser }> = await res.json();

        if (!json.success) {
          return { success: false, error: json.error.message, fieldErrors: json.error.fieldErrors };
        }

        
        return { success: true };
      } catch {
        return { success: false, error: "Network error. Please try again." };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
