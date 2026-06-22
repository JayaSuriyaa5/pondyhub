"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/siteConfig";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const result = await login(identifier, password);

    if (!result.success) {
      setFormError(result.error || "Something went wrong. Please try again.");
      setFieldErrors(result.fieldErrors || {});
      return;
    }

    const next = searchParams.get("next") || "/";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      {/* Ambient coastal backdrop */}
      <div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-coastal-ocean/10 blur-3xl dark:bg-coastal-ocean/20"
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-coastal-terracotta/10 blur-3xl dark:bg-coastal-terracotta/15"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="glass-strong rounded-3xl p-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-coastal-ocean to-coastal-lagoon text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M2 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </Link>
            <h1 className="mt-4 font-display text-2xl font-medium text-coastal-ink dark:text-white">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Log in to continue to {siteConfig.name}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {formError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {formError}
              </div>
            )}

            <Input
              label="Email or username"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={fieldErrors.identifier?.[0]}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password?.[0]}
            />

            <Button type="submit" isLoading={isLoading} className="mt-2 w-full" size="lg">
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            New to {siteConfig.name}?{" "}
            <Link href="/register" className="font-medium tide-underline text-coastal-ocean dark:text-brand-300">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
