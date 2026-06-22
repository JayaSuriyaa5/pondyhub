import Image from "next/image";
import clsx from "clsx";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { px: 28, classes: "h-7 w-7 text-xs" },
  md: { px: 40, classes: "h-10 w-10 text-sm" },
  lg: { px: 64, classes: "h-16 w-16 text-xl" },
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic color from name, so the same user always gets the same
// fallback color across the app.
const FALLBACK_COLORS = [
  "bg-coastal-ocean",
  "bg-coastal-lagoon",
  "bg-brand-600",
  "bg-brand-700",
  "bg-cyan-700",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[hash];
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const { px, classes } = sizeMap[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className={clsx("rounded-full object-cover", classes, className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full font-semibold text-white",
        colorForName(name),
        classes,
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
