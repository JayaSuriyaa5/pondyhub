"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

interface ReportButtonProps {
  targetType: "post" | "comment";
  targetId: string;
  /** Compact text-link style for inline placement (e.g. next to CommentItem's Reply/Edit/Delete row) */
  variant?: "button" | "link";
}

const REASONS: { value: string; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "SCAM_FRAUD", label: "Scam/Fraud" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "FAKE_INFORMATION", label: "Fake Information" },
  { value: "NSFW", label: "NSFW" },
  { value: "OTHER", label: "Other" },
];

export function ReportButton({ targetType, targetId, variant = "link" }: ReportButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("SPAM");
  const [detail, setDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function openModal() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError(null);
    setSubmitted(false);
    setIsOpen(true);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          detail: detail.trim() || undefined,
          ...(targetType === "post" ? { postId: targetId } : { commentId: targetId }),
        }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Couldn't submit your report. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {variant === "link" ? (
        <button
          onClick={openModal}
          className="text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
        >
          Report
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={openModal}>
          Report
        </Button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="surface-card w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
          >
            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="text-2xl" aria-hidden="true">✅</span>
                <p id="report-dialog-title" className="font-medium text-coastal-ink dark:text-slate-100">
                  Report submitted
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Thanks for helping keep PondyHub safe. Our moderators will review this.
                </p>
                <Button size="sm" className="mt-2" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <>
                <h3 id="report-dialog-title" className="font-display text-lg font-medium text-coastal-ink dark:text-white">
                  Report this {targetType}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tell us why this content should be reviewed.
                </p>

                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-brand-50/60 dark:hover:bg-white/5"
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-coastal-ocean"
                      />
                      <span className="text-coastal-ink dark:text-slate-200">{r.label}</span>
                    </label>
                  ))}
                </div>

                {reason === "OTHER" && (
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="Briefly describe the issue..."
                    rows={2}
                    maxLength={500}
                    className="mt-3 w-full resize-none rounded-lg border border-slate-200 bg-coastal-shell px-3 py-2 text-sm text-coastal-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:border-abyss-700 dark:bg-abyss-900 dark:text-slate-100"
                  />
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
                    Submit report
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
