"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";
  const signupHref = `/signup?redirect=${encodeURIComponent(redirectTo)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface2 p-6">
        <h1 className="mb-5 font-display text-xl font-semibold text-white">
          Log in to <span className="text-gradient-neon">cultbid.in</span>
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Email</span>
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-white outline-none focus-visible:border-neon"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Password</span>
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-white outline-none focus-visible:border-neon"
            />
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-semibold text-void shadow-neon disabled:opacity-60"
          >
            {loading && <Spinner className="h-4 w-4 text-void" />}
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <a href={signupHref} className="text-white underline">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
