"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { signInSchema, signUpSchema } from "@/lib/schemas/auth";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

function authMessage(err: unknown): string {
  if (!err || typeof err !== "object") {
    return err instanceof Error ? err.message : "Something went wrong";
  }
  const e = err as { message?: string; code?: string };
  const msg = typeof e.message === "string" ? e.message : "Something went wrong";
  if (e.code === "email_not_confirmed") {
    return "Wrong login or password.";
  }
  if (msg.toLowerCase().includes("email not confirmed")) {
    return "Wrong login or password.";
  }
  return msg;
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      let supabase;
      try {
        supabase = createBrowserSupabaseClient();
      } catch {
        throw new Error(
          "Configure NEXT_PUBLIC_SUPABASE_URL and a client key (anon or publishable).",
        );
      }

      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ name, email, password });
        if (!parsed.success) {
          throw new Error(parsed.error.issues.map((e) => e.message).join(". "));
        }
        const { data, error: e } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { display_name: parsed.data.name },
          },
        });
        if (e) throw e;
        if (data.session) {
          router.push(next);
          router.refresh();
          return;
        }
        setMode("signin");
        return;
      }

      const parsed = signInSchema.safeParse({ email, password });
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map((e) => e.message).join(". "));
      }
      const { error: e } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (e) throw e;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 w-full max-w-md space-y-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>

      {mode === "signup" ? (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="name">
            Name
          </label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Founder"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <Input
          id="email"
          type="text"
          inputMode="email"
          autoComplete="username"
          aria-label="Login"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Login"
        />
      </div>

      <div className="space-y-1">
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="button" className="w-full" disabled={loading} onClick={() => void submit()}>
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-xs text-zinc-500">
        <Link href="/" className={buttonClassName("ghost", "sm", "h-auto px-1 py-0 text-xs")}>
          ← Home
        </Link>
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
