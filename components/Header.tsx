"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";
import { BrandMark } from "@/components/BrandMark";

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

function Bars3Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-5 w-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-5 w-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function NavLabel({ icon, label, labelClassName }: { icon: ReactNode; label: string; labelClassName?: string }) {
  return <span className="inline-flex items-center gap-1.5">{icon}<span className={labelClassName}>{label}</span></span>;
}

function getUserDisplayName(user: User | null): string {
  if (!user) {
    return "User";
  }

  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || "User";
}

function getUserAvatarUrl(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  return metadata.avatar_url || metadata.picture || null;
}

function getUserInitials(user: User | null): string {
  const displayName = getUserDisplayName(user).trim();
  if (!displayName) {
    return "U";
  }

  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function UserIdentity({ user, mobile = false }: { user: User | null; mobile?: boolean }) {
  const avatarUrl = getUserAvatarUrl(user);
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const avatarSize = mobile ? "h-9 w-9" : "h-8 w-8";
  const labelClassName = mobile ? "text-stone-100" : "text-stone-200";

  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${displayName} profile photo`}
          referrerPolicy="no-referrer"
          className={`${avatarSize} rounded-full border border-white/15 object-cover shadow-[0_6px_16px_rgba(0,0,0,0.24)]`}
        />
      ) : (
        <span
          className={`${avatarSize} inline-flex items-center justify-center rounded-full border border-[#22d3ee]/30 bg-[#22d3ee]/12 text-[0.72rem] font-semibold tracking-[0.08em] text-[#b6f3ff]`}
          aria-hidden
        >
          {initials}
        </span>
      )}
      <span className={`truncate ${labelClassName}`}>{displayName}</span>
    </span>
  );
}

function NavDivider({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="mx-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden />
  ) : (
    <span className="h-6 w-px bg-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]" aria-hidden />
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push("/auth");
    router.refresh();
  };

  return (
    <header className="border-b border-stone-800/80 bg-stone-950/95 text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur supports-[backdrop-filter]:bg-stone-950/85">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6">
        <Link href="/" className="min-w-0" aria-label="Go to the Company Deep-Dive Engine homepage">
          <BrandMark compact tone="dark" />
        </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-stone-100 transition-colors hover:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]/50 sm:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-site-menu"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <XMarkIcon /> : <Bars3Icon />}
          </button>
          <nav className="hidden items-center gap-6 sm:flex">
          {user ? (
            <>
              <Link href="/deep-dive/new" className="text-sm text-stone-100 hover:text-[#22d3ee] transition-colors">
                <NavLabel
                  icon={<PencilSquareIcon className="h-4 w-4 text-[#a5b4fc]" />}
                  label="New Analysis"
                  labelClassName="text-stone-100"
                />
              </Link>
              <NavDivider />
              <Link href="/history" className="text-sm text-stone-100 hover:text-[#22d3ee] transition-colors">
                <NavLabel
                  icon={<ClockIcon className="h-4 w-4 text-[#22d3ee]" />}
                  label="History"
                  labelClassName="text-stone-100"
                />
              </Link>
              {isAdmin(user.email) && (
                <>
                  <NavDivider />
                  <Link href="/admin" className="text-sm text-stone-100 hover:text-[#22d3ee] transition-colors">
                    <NavLabel
                      icon={<ShieldIcon className="h-4 w-4 text-[#a5b4fc]" />}
                      label="Admin"
                      labelClassName="text-stone-100"
                    />
                  </Link>
                </>
              )}
              <NavDivider />
              <span className="inline-flex items-center gap-3">
                <span className="hidden max-w-[16rem] text-sm text-stone-200 sm:block">
                  <UserIdentity user={user} />
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-stone-100 hover:text-rose-200 transition-colors"
                >
                  <NavLabel
                    icon={<ArrowRightOnRectangleIcon className="h-4 w-4 text-rose-300" />}
                    label="Sign out"
                    labelClassName="text-stone-100"
                  />
                </button>
              </span>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-stone-100 hover:bg-white/14 transition-colors shadow-[0_10px_20px_rgba(0,0,0,0.18)]"
            >
              Sign in
            </Link>
          )}
          </nav>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-site-menu"
            className="mt-4 rounded-2xl border border-white/10 bg-stone-900/95 p-3 shadow-[0_18px_32px_rgba(0,0,0,0.28)] sm:hidden"
          >
            <nav className="flex flex-col gap-2">
              {user ? (
                <>
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-stone-200">
                    <div className="flex items-center justify-between gap-3">
                      <UserIdentity user={user} mobile />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="shrink-0 rounded-lg px-2 py-2 text-left text-sm text-stone-100 transition-colors hover:bg-white/[0.06] hover:text-rose-200"
                      >
                        <NavLabel
                          icon={<ArrowRightOnRectangleIcon className="h-4 w-4 text-rose-300" />}
                          label="Sign out"
                          labelClassName="text-stone-100"
                        />
                      </button>
                    </div>
                  </div>
                  <Link
                    href="/deep-dive/new"
                    className="rounded-xl px-3 py-3 text-sm text-stone-100 transition-colors hover:bg-white/[0.06] hover:text-[#22d3ee]"
                  >
                    <NavLabel
                      icon={<PencilSquareIcon className="h-4 w-4 text-[#a5b4fc]" />}
                      label="New Analysis"
                      labelClassName="text-stone-100"
                    />
                  </Link>
                  <NavDivider mobile />
                  <Link
                    href="/history"
                    className="rounded-xl px-3 py-3 text-sm text-stone-100 transition-colors hover:bg-white/[0.06] hover:text-[#22d3ee]"
                  >
                    <NavLabel
                      icon={<ClockIcon className="h-4 w-4 text-[#22d3ee]" />}
                      label="History"
                      labelClassName="text-stone-100"
                    />
                  </Link>
                  {isAdmin(user.email) && (
                    <>
                      <NavDivider mobile />
                      <Link
                        href="/admin"
                        className="rounded-xl px-3 py-3 text-sm text-stone-100 transition-colors hover:bg-white/[0.06] hover:text-[#22d3ee]"
                      >
                        <NavLabel
                          icon={<ShieldIcon className="h-4 w-4 text-[#a5b4fc]" />}
                          label="Admin"
                          labelClassName="text-stone-100"
                        />
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href="/auth"
                  className="rounded-xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-stone-100 transition-colors hover:bg-white/14"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
