"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

// Persist the Supabase client across renders
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function PencilSquareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-4 w-4"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L8.25 18.463 4.5 19.5l1.037-3.75L16.862 3.487Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.099 17.9 9.75" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-4 w-4"}>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.75v4.75l3.25 1.75" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-4 w-4"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c2.693 1.49 5.527 2.332 8.25 2.458v5.117c0 4.29-2.4 8.218-6.2 10.15L12 22.5l-2.05-1.025c-3.8-1.932-6.2-5.86-6.2-10.15V6.208c2.723-.126 5.557-.968 8.25-2.458Z" />
    </svg>
  );
}

function ArrowRightOnRectangleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-4 w-4"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25 19.5 12l-3.75 3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h10.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5h-3A2.25 2.25 0 0 0 5.25 6.75v10.5A2.25 2.25 0 0 0 7.5 19.5h3" />
    </svg>
  );
}

function UserBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-4 w-4"}>
      <circle cx="12" cy="8" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 18.25a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function NavLabel({ icon, label, labelClassName }: { icon: ReactNode; label: string; labelClassName?: string }) {
  return <span className="inline-flex items-center gap-1.5">{icon}<span className={labelClassName}>{label}</span></span>;
}

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
              <span className="text-sm text-gray-900 hidden sm:block">
                <NavLabel icon={<UserBadgeIcon className="h-4 w-4 text-violet-600" />} label={user.user_metadata?.name || user.email || "User"} labelClassName="text-gray-900" />
              </span>
              <Link href="/deep-dive/new" className="text-sm text-gray-900 hover:text-gray-900 transition-colors">
                <NavLabel icon={<PencilSquareIcon className="h-4 w-4 text-emerald-600" />} label="New Analysis" labelClassName="text-gray-900" />
              </Link>
              <Link href="/history" className="text-sm text-gray-900 hover:text-gray-900 transition-colors">
                <NavLabel icon={<ClockIcon className="h-4 w-4 text-sky-600" />} label="History" labelClassName="text-gray-900" />
              </Link>
              {isAdmin(user.email) && (
                <Link href="/admin" className="text-sm text-gray-900 hover:text-gray-900 transition-colors">
                  <NavLabel icon={<ShieldIcon className="h-4 w-4 text-amber-600" />} label="Admin" labelClassName="text-gray-900" />
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-900 hover:text-gray-900 transition-colors"
              >
                <NavLabel icon={<ArrowRightOnRectangleIcon className="h-4 w-4 text-rose-600" />} label="Sign out" labelClassName="text-gray-900" />
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
