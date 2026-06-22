import { forwardRef, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-coastal-ink dark:text-slate-200">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            "rounded-lg border bg-coastal-shell px-3 py-2 text-sm text-coastal-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-coastal-ocean dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700",
            error ? "border-red-400 focus:ring-red-400" : "border-slate-200",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
