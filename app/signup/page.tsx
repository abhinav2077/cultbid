"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";
  const loginHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Supabase Auth hashes and stores the password itself — this app
    // never sees or stores it in plain form beyond this request.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, username },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push(redirectTo);
      router.refresh();
    } else {
      // Email confirmation is on — Supabase project default.
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell title="Check your inbox">
        <p className="text-sm text-muted">
          We sent a confirmation link to <span className="text-white">{email}</span>. Click it to
          activate your account, then come back and log in.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Name" value={name} onChange={setName} required />
        <Field label="Username" value={username} onChange={setUsername} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-semibold text-void disabled:opacity-60"
        >
          {loading && <Spinner className="h-4 w-4 text-void" />}
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <a href={loginHref} className="text-white underline">
          Log in
        </a>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface2 p-6">
        <h1 className="mb-5 font-display text-xl font-semibold text-white">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-white outline-none focus-visible:border-neon"
      />
    </label>
  );
}
