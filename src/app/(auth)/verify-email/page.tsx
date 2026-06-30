"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { siteConfig } from "@/lib/siteConfig";

type VerifyState = "loading" | "success" | "expired" | "already_used" | "invalid" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    let cancelled = false;

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json: { success: boolean; error?: { code?: string } }) => {
        if (cancelled) return;

        if (json.success) {
          setState("success");
          return;
        }

        switch (json.error?.code) {
          case "TOKEN_EXPIRED":
            setState("expired");
            break;
          case "TOKEN_ALREADY_USED":
            setState("already_used");
            break;
          case "TOKEN_INVALID":
          case "MISSING_TOKEN":
            setState("invalid");
            break;
          default:
            setState("error");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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
        <div className="glass-strong rounded-3xl p-8 text-center">
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

          {state === "loading" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Verifying your email…</p>
            </div>
          )}

          {state === "success" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-3xl" aria-hidden="true">✅</span>
              <h1 className="font-display text-xl font-medium text-coastal-ink dark:text-white">
                Email verified
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your email has been confirmed. You can now log in to {siteConfig.name}.
              </p>
              <Link href="/login" className="mt-2 w-full">
                <Button className="w-full">Log in</Button>
              </Link>
            </div>
          )}

          {state === "expired" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-3xl" aria-hidden="true">⏰</span>
              <h1 className="font-display text-xl font-medium text-coastal-ink dark:text-white">
                Link expired
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This verification link has expired. Log in with your password to request a new one.
              </p>
              <Link href="/login" className="mt-2 w-full">
                <Button className="w-full">Go to login</Button>
              </Link>
            </div>
          )}

          {state === "already_used" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-3xl" aria-hidden="true">👍</span>
              <h1 className="font-display text-xl font-medium text-coastal-ink dark:text-white">
                Already verified
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This link has already been used. Your email is already confirmed — you can log in.
              </p>
              <Link href="/login" className="mt-2 w-full">
                <Button className="w-full">Log in</Button>
              </Link>
            </div>
          )}

          {state === "invalid" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
              <h1 className="font-display text-xl font-medium text-coastal-ink dark:text-white">
                Invalid link
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This verification link isn't valid. Double-check the link from your email, or log in to request a new one.
              </p>
              <Link href="/login" className="mt-2 w-full">
                <Button variant="outline" className="w-full">
                  Go to login
                </Button>
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-3xl" aria-hidden="true">😕</span>
              <h1 className="font-display text-xl font-medium text-coastal-ink dark:text-white">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We couldn't verify your email right now. Please try again in a moment.
              </p>
              <Link href="/login" className="mt-2 w-full">
                <Button variant="outline" className="w-full">
                  Go to login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}