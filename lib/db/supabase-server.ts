import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Route Handlers (API routes).
 * Reads/writes session from request cookies so auth state is preserved.
 */
export function createRouteClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // PATCH: Fallback for environments where getAll is not a function
          if (typeof cookieStore.getAll === "function") {
            return cookieStore.getAll();
          }
          return [];
        },
        setAll(cookiesToSet) {
          if (typeof cookieStore.set === "function") {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          }
        },
      },
    }
  );
}
