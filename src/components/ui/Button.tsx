import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "glass";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-coastal-ocean text-white shadow-sm hover:bg-coastal-oceanDark hover:shadow-md active:scale-[0.98] disabled:bg-brand-300",
  secondary:
    "bg-brand-100 text-coastal-oceanDark hover:bg-brand-200 active:scale-[0.98] dark:bg-abyss-700 dark:text-brand-100 dark:hover:bg-abyss-700/70",
  ghost:
    "bg-transparent text-coastal-ink hover:bg-brand-50 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-white/5",
  outline:
    "bg-transparent border border-coastal-ocean/40 text-coastal-ocean hover:border-coastal-ocean hover:bg-brand-50 active:scale-[0.98] dark:border-brand-700 dark:text-brand-300 dark:hover:bg-white/5",
  glass:
    "glass text-coastal-ink hover:bg-white/80 active:scale-[0.98] dark:text-slate-100 dark:hover:bg-abyss-800/70",
  danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] disabled:bg-red-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-coastal-ocean focus-visible:ring-offset-2 dark:focus-visible:ring-offset-abyss-950",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
