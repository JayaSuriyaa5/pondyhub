"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/types";

export function SettingsForm({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/users/${user.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      const json: { success: boolean; error?: { message: string } } = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Couldn't save changes. Please try again.");
        return;
      }

      await refetchUser();
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={displayName || user.username} size="lg" />
        <div>
          <p className="text-sm font-medium text-coastal-ink dark:text-slate-200">@{user.username}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          Profile updated.
        </div>
      )}

      <Input
        label="Display name"
        name="displayName"
        maxLength={50}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={user.username}
      />

      <TextArea
        label="Bio"
        name="bio"
        rows={4}
        maxLength={500}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Tell the PondyHub community about yourself..."
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
