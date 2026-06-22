"use client";

import { useAuthContext } from "@/context/AuthContext";

/**
 * Thin convenience wrapper so components can `import { useAuth } from
 * "@/hooks/useAuth"` rather than reaching into the context module directly.
 */
export function useAuth() {
  return useAuthContext();
}
