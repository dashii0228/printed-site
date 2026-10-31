import { useAuth } from "@clerk/react";
import { useMemo } from "react";
import { createAdminFetch } from "./admin-request";

export function useAdminFetch() {
  const { getToken } = useAuth();
  // Replit-managed web auth keeps its cookie flow. External Netlify builds
  // explicitly opt into the external Clerk session-token transport.
  return useMemo(
    () => createAdminFetch(getToken, import.meta.env.VITE_CLERK_AUTH_TRANSPORT === "bearer"),
    [getToken],
  );
}
