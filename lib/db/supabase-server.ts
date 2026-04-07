import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

/**
 * Creates a Supabase client for use in Route Handlers (API routes).
 * Reads session directly from the incoming NextRequest cookies so auth
 * state is reliably preserved (avoids the Next.js 15 async cookies() issue).
 */
export function createRouteClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // Route handlers that only need to read auth don't need to set cookies.
          // The proxy.ts middleware handles cookie refresh on every request.
        },
      },
    }
  );
}
