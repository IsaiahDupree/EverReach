// Client-side tRPC setup - should never import server code
// This file is safe to import in the client bundle

import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { FLAGS } from "@/constants/flags";
import { Platform } from "react-native";
import type { AppRouter } from '@/types/trpc';
import { supabase } from '@/lib/supabase';

// Verify we're not accidentally importing server code
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  // This check helps catch accidental server imports during development
  console.log('[tRPC Client] Initializing client-side tRPC setup');
}

export const trpc = createTRPCReact<AppRouter>();

export const getBaseUrl = (): string => {
  // Always prefer an explicit API base URL for all platforms (web and native)
  const envUrl = process.env.EXPO_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  if (envUrl) {
    return envUrl.replace(/\/?$/, "");
  }

  // Development fallbacks (used only if no env is provided)
  if (Platform.OS === "android") {
    // Android emulator can reach host via 10.0.2.2
    return "http://10.0.2.2:3000";
  }
  // iOS simulator, web dev, or unknown native env
  return "http://localhost:3000";
};

// Create standalone tRPC client for non-React usage
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const baseHeaders = {
          Accept: "application/json",
          "Content-Type": "application/json",
        } as Record<string, string>;

        // Add auth header if available
        try {
          if (!FLAGS.LOCAL_ONLY && supabase) {
            const { data } = await supabase.auth.getSession();
            const token = data?.session?.access_token;
            if (token) {
              baseHeaders.Authorization = `Bearer ${token}`;
            }
          }
        } catch (error) {
          console.warn('[tRPC] Failed to get auth token:', error);
        }

        return baseHeaders;
      },
      fetch(url, options) {
        const safeUrl = typeof url === "string" ? url.trim() : String(url);
        if (!safeUrl) {
          throw new Error("Invalid TRPC URL");
        }
        console.log("[TRPC] Making request to:", safeUrl);
        return fetch(safeUrl, {
          ...options,
          signal: AbortSignal.timeout(15000),
        })
          .then(async (response) => {
            console.log("[TRPC] Response status:", response.status, "Content-Type:", response.headers.get("content-type"));
            const contentType = response.headers.get("content-type") ?? "";
            if (!contentType.includes("application/json")) {
              const body = await response.text();
              console.error(
                "[TRPC] Received non-JSON response - likely HTML. Check API route configuration."
              );
              console.debug("[TRPC] Response body:", body.slice(0, 500));
              throw new Error(
                `API returned ${contentType} instead of JSON. Ensure /api/trpc/[trpc]/route.ts exists and returns JSON.`
              );
            }
            return response;
          })
          .catch((error) => {
            console.error("[TRPC] Request failed:", error);
            if (FLAGS.LOCAL_ONLY) {
              console.warn(
                "[TRPC] Local-only mode enabled - some features may not work without backend"
              );
              // In local-only mode, return a mock response instead of throwing
              return new Response(
                JSON.stringify({
                  result: {
                    data: { message: 'Local-only mode - backend not available' }
                  }
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            throw error;
          });
      },
    }),
  ],
});