import type { HTMLAttributes } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glass?: boolean;
}

export function Card({ className, interactive, glass, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        glass ? "glass rounded-2xl" : interactive ? "surface-card-interactive" : "surface-card",
        className
      )}
      {...props}
    />
  );
}
