import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        🏖️
      </span>
      <h1 className="mt-4 font-display text-display-sm font-medium text-coastal-ink dark:text-white">
        Lost at sea
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        We couldn&apos;t find the page you&apos;re looking for. It may have been moved or removed.
      </p>
      <Link href="/" className="mt-6">
        <Button>Back to PondyHub</Button>
      </Link>
    </div>
  );
}
