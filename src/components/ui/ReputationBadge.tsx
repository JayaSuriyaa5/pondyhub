"use client";

import { useState } from "react";
import clsx from "clsx";
import { getReputationTier, getNextTier } from "@/lib/reputation";

interface ReputationBadgeProps {
  karma: number;
  size?: "sm" | "md";
  showKarma?: boolean;
}

export function ReputationBadge({ karma, size = "md", showKarma = false }: ReputationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tier = getReputationTier(karma);
  const next = getNextTier(karma);

  return (
    <span className="relative inline-block">
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full font-semibold tracking-wide",
          tier.className,
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
        )}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((v) => !v)}
        tabIndex={0}
        role="button"
        aria-describedby="reputation-tooltip"
      >
        <TierIcon tierKey={tier.key} className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {tier.label}
        {showKarma && <span className="opacity-80">· {karma}</span>}
      </span>

      {showTooltip && (
        <div
          id="reputation-tooltip"
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 animate-scale-in rounded-xl glass-strong p-3 text-xs text-coastal-ink shadow-glass dark:text-slate-100"
        >
          <p className="font-semibold">{tier.label}</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{tier.description}</p>
          {next && (
            <p className="mt-2 border-t border-brand-100 pt-2 text-slate-500 dark:border-abyss-700 dark:text-slate-400">
              {next.minKarma - karma} more karma to reach{" "}
              <span className="font-medium text-coastal-ocean dark:text-brand-300">{next.label}</span>
            </p>
          )}
        </div>
      )}
    </span>
  );
}

function TierIcon({ tierKey, className }: { tierKey: string; className?: string }) {
  // A small set of distinct glyphs per tier so badges are recognizable at a
  // glance, not just colored text.
  switch (tierKey) {
    case "pondy-legend":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2l2.4 6.5L21 9l-5 4.2L17.5 21 12 17l-5.5 4L8 13.2 3 9l6.6-.5z" />
        </svg>
      );
    case "local-guide":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 21s-7-5.2-7-11a7 7 0 1114 0c0 5.8-7 11-7 11z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "trusted":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 2l8 3.5v6c0 5-3.5 8.5-8 10.5-4.5-2-8-5.5-8-10.5v-6L12 2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "regular":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.5 12.5l2 2 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}
