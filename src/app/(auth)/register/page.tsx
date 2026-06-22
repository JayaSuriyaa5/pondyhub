"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/siteConfig";

const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
];

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const result = await register(username, email, password);

    if (!result.success) {
      setFormError(result.error || "Something went wrong. Please try again.");
      setFieldErrors(result.fieldErrors || {});
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
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
              Join {siteConfig.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your account to start discussing Pondicherry.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {formError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {formError}
              </div>
            )}

            <Input
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username?.[0]}
              hint="Letters, numbers, and underscores only"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email?.[0]}
            />

            <div>
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                error={fieldErrors.password?.[0]}
              />
              {(passwordFocused || password.length > 0) && (
                <ul className="mt-2 grid grid-cols-2 gap-1.5">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <li
                        key={rule.label}
                        className={clsx(
                          "flex items-center gap-1.5 text-xs transition-colors",
                          passed
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                          {passed ? (
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : (
                            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
                          )}
                        </svg>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Button type="submit" isLoading={isLoading} className="mt-2 w-full" size="lg">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium tide-underline text-coastal-ocean dark:text-brand-300">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
