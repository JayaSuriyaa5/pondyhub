"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/types";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB — mirrors src/lib/avatarUpload.ts
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function SettingsForm({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Local optimistic avatar preview — separate from the profile-field
  // success/error state above, since uploading an avatar is its own
  // independent action (fires immediately on file selection, not on
  // the "Save Changes" submit below).
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Always clear the input value so selecting the *same* file again
    // (e.g. after fixing it and re-picking it) still fires onChange.
    e.target.value = "";
    if (!file) return;

    setAvatarError(null);

    // Client-side checks are purely for fast feedback -- the server
    // re-validates both of these independently (and inspects actual file
    // content, not just the browser-reported type) before ever writing
    // to disk, since client-side validation can always be bypassed.
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 2MB or smaller.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(`/api/users/${user.username}/avatar`, {
        method: "POST",
        body: formData,
      });
      const json: { success: boolean; data?: { avatarUrl: string | null }; error?: { message: string } } =
        await res.json();

      if (!json.success || !json.data) {
        setAvatarError(json.error?.message || "Couldn't upload your avatar. Please try again.");
        return;
      }

      setAvatarUrl(json.data.avatarUrl);
      await refetchUser();
      router.refresh();
    } catch {
      setAvatarError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setIsRemovingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch(`/api/users/${user.username}/avatar`, { method: "DELETE" });
      const json: { success: boolean; error?: { message: string } } = await res.json();

      if (!json.success) {
        setAvatarError(json.error?.message || "Couldn't remove your avatar. Please try again.");
        return;
      }

      setAvatarUrl(null);
      await refetchUser();
      router.refresh();
    } catch {
      setAvatarError("Network error. Please check your connection and try again.");
    } finally {
      setIsRemovingAvatar(false);
    }
  }

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
        <Avatar src={avatarUrl} name={displayName || user.username} size="lg" />
        <div>
          <p className="text-sm font-medium text-coastal-ink dark:text-slate-200">@{user.username}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isLoading={isRemovingAvatar}
                onClick={handleRemoveAvatar}
              >
                Remove
              </Button>
            )}
          </div>
          {avatarError && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{avatarError}</p>
          )}
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            JPG, PNG, or WEBP. Max 2MB.
          </p>
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
