"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/deep-dive/new");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("login");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex justify-center" aria-label="Go to the Company Deep-Dive Engine homepage">
            <BrandMark />
          </Link>
          <p className="text-[#7a6d63] mt-2 text-sm">
            {mode === "login" ? "Sign in to your account" : "Create an account"}
          </p>
        </div>

        <div className="bg-white border border-[#e4ddd4] rounded-xl p-6 space-y-4 shadow-[0_2px_16px_rgba(28,23,19,0.07)]">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white text-[#1c1713] px-6 py-2.5 rounded-lg font-medium border border-[#d4cdc4] hover:bg-[#faf8f3] disabled:opacity-50 transition text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_17_40)"><path d="M47.5 24.552c0-1.636-.146-3.2-.418-4.704H24.48v9.02h13.02c-.528 2.84-2.12 5.24-4.52 6.86v5.68h7.32c4.28-3.94 6.7-9.74 6.7-16.856z" fill="#4285F4"/><path d="M24.48 48c6.12 0 11.24-2.04 14.98-5.56l-7.32-5.68c-2.04 1.36-4.66 2.16-7.66 2.16-5.88 0-10.86-3.96-12.64-9.28H4.98v5.82C8.7 43.36 15.98 48 24.48 48z" fill="#34A853"/><path d="M11.84 29.64A13.98 13.98 0 0 1 10.5 24c0-1.96.36-3.86 1-5.64v-5.82H4.98A23.98 23.98 0 0 0 .5 24c0 3.98.96 7.76 2.68 11.06l8.66-5.42z" fill="#FBBC05"/><path d="M24.48 9.52c3.34 0 6.32 1.14 8.68 3.38l6.48-6.48C35.72 2.04 30.6 0 24.48 0 15.98 0 8.7 4.64 4.98 12.18l8.66 5.82c1.78-5.32 6.76-9.28 12.84-9.28z" fill="#EA4335"/></g><defs><clipPath id="clip0_17_40"><path fill="#fff" d="M0 0h48v48H0z"/></clipPath></defs></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e4ddd4]" />
            <span className="text-xs text-[#9c8d81]">or</span>
            <div className="flex-1 h-px bg-[#e4ddd4]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-[#1a4a3a]/8 border border-[#1a4a3a]/20 text-[#1a4a3a] px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#4a3f36] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#d4cdc4] rounded-lg text-sm text-[#1c1713] placeholder:text-[#b0a496] focus:outline-none focus:ring-2 focus:ring-[#1a4a3a]/30 focus:border-[#1a4a3a]/40 transition bg-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4a3f36] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#d4cdc4] rounded-lg text-sm text-[#1c1713] placeholder:text-[#b0a496] focus:outline-none focus:ring-2 focus:ring-[#1a4a3a]/30 focus:border-[#1a4a3a]/40 transition bg-white"
                placeholder="Min. 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a4a3a] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#153d30] disabled:opacity-50 transition"
            >
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-[#7a6d63]">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                className="font-medium text-[#1a4a3a] hover:underline underline-offset-2"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                className="font-medium text-[#1a4a3a] hover:underline underline-offset-2"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
