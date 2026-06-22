import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "brand" | "neutral" | "success" | "warning" | "danger" | "terracotta";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-100 text-coastal-oceanDark dark:bg-brand-900 dark:text-brand-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-abyss-800 dark:text-slate-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  terracotta: "bg-coastal-terracotta/15 text-coastal-terracottaDark dark:bg-coastal-terracotta/20 dark:text-orange-300",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
