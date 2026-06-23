import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

/**
 * Avatar upload validation + disk storage.
 *
 * Security note: file type is validated by inspecting the actual file
 * content (magic bytes / file signature), NOT by trusting the client-sent
 * `Content-Type` header or the file extension -- both of those are
 * trivially spoofable (e.g. renaming malware.exe to photo.png). This is
 * the same "never trust client input" principle src/lib/sanitize.ts
 * applies to HTML content, applied here to file uploads.
 */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedAvatarType = (typeof ALLOWED_AVATAR_TYPES)[number];

const EXTENSION_BY_TYPE: Record<AllowedAvatarType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Avatars are written here; this directory is bind-mounted as a named
// Docker volume in docker-compose.yml (pondyhub_avatars) so uploads
// survive container rebuilds, and is git-ignored except for .gitkeep
// (see .gitignore's "public/avatars/*" rule).
const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");

export interface AvatarValidationError {
  code: "INVALID_TYPE" | "TOO_LARGE" | "EMPTY_FILE";
  message: string;
}

export interface AvatarValidationResult {
  valid: true;
  detectedType: AllowedAvatarType;
}

/**
 * Inspects the first few bytes of a file buffer to determine its real
 * type, regardless of what extension or Content-Type header the client
 * sent. Covers JPEG, PNG, and WebP signatures only -- anything else is
 * rejected, including files that merely *claim* to be one of these types.
 */
function detectImageType(buffer: Buffer): AllowedAvatarType | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP" (bytes 0-3 and 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validates an uploaded file's size and real content type. Returns either
 * a validation error (safe to show the user directly) or the detected
 * type to use for the stored file's extension.
 */
export function validateAvatarFile(
  buffer: Buffer
): AvatarValidationResult | { valid: false; error: AvatarValidationError } {
  if (buffer.length === 0) {
    return { valid: false, error: { code: "EMPTY_FILE", message: "The uploaded file is empty." } };
  }

  if (buffer.length > MAX_AVATAR_BYTES) {
    return {
      valid: false,
      error: { code: "TOO_LARGE", message: "Image must be 2MB or smaller." },
    };
  }

  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return {
      valid: false,
      error: {
        code: "INVALID_TYPE",
        message: "Only JPG, PNG, and WEBP images are allowed.",
      },
    };
  }

  return { valid: true, detectedType };
}

/**
 * Writes a validated avatar buffer to disk and returns its public URL
 * (relative path under /avatars/, servable directly by Next's static
 * file handling for the `public/` directory).
 *
 * Filename includes both the user's ID (groups a user's uploads, makes
 * orphan cleanup possible) and a timestamp (guarantees a fresh URL on
 * every re-upload, so browsers/CDNs never serve a stale cached avatar
 * for the same path).
 */
export async function saveAvatarFile(userId: string, buffer: Buffer, type: AllowedAvatarType): Promise<string> {
  await mkdir(AVATAR_DIR, { recursive: true });

  const extension = EXTENSION_BY_TYPE[type];
  const filename = `${userId}-${Date.now()}.${extension}`;
  const filePath = path.join(AVATAR_DIR, filename);

  await writeFile(filePath, buffer);

  return `/avatars/${filename}`;
}

/**
 * Deletes a previously-stored avatar file given its public URL (as
 * stored in User.avatarUrl). Best-effort: failures are swallowed because
 * a missing file (already deleted, manually removed, etc.) shouldn't
 * block the user from uploading a new avatar.
 *
 * Defensively re-derives the filename and re-joins it against AVATAR_DIR
 * rather than trusting the stored path directly, so a malformed or
 * malicious avatarUrl value already in the database can't be used to
 * delete an arbitrary file elsewhere on disk (path traversal).
 */
export async function deleteAvatarFile(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith("/avatars/")) return;

  const filename = path.basename(avatarUrl);
  // path.basename strips any "../" segments, so this can only ever
  // resolve to a path directly inside AVATAR_DIR.
  const filePath = path.join(AVATAR_DIR, filename);

  try {
    await unlink(filePath);
  } catch {
    // Already gone, or never existed -- not an error condition here.
  }
}
