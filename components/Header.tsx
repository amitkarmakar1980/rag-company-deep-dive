"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";

// Persist the Supabase client across renders
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-base font-semibold tracking-tight text-gray-900">
          Deep-Dive Engine
        </Link>
        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <span className="text-sm text-gray-400 hidden sm:block">
                {user.user_metadata?.name || user.email}
              </span>
              <Link href="/deep-dive/new" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                New Analysis
              </Link>
              <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                History
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-sm font-medium text-gray-900 hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
