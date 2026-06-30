import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AccountTokenType } from "@prisma/client";

/**
 * Email verification token lifecycle, backed by the existing
 * `account_tokens` table (shared with password-reset tokens via its
 * `type` column, though this file only ever reads/writes rows where
 * type = EMAIL_VERIFICATION -- password reset is out of scope for this
 * phase and this file does not touch it).
 *
 * Security note: only the SHA-256 hash of the token is ever stored.
 * The raw token exists only transiently -- generated here, embedded in
 * the verification email's URL (by the caller), and briefly in request
 * memory when a user clicks the link and it's hashed again for lookup.
 * A leak of the account_tokens table alone never yields a usable link.
 * SHA-256 (not bcrypt) is the right tool here specifically because the
 * input is high-entropy random data, not a guessable human-chosen
 * value -- there's no brute-force-slowing purpose a deliberately slow
 * hash would serve in this case, unlike password storage in auth.ts.
 */

const TOKEN_BYTES = 32; // 256 bits of entropy, hex-encoded for URL safety
const EXPIRY_HOURS = 48; // matches the expiry stated in the verification email template (src/lib/email.ts)

export interface CreatedVerificationToken {
  /** The raw, unhashed token -- embed this in the verification URL. Never store this value anywhere. */
  rawToken: string;
  expiresAt: Date;
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a fresh email-verification token for a user and persists
 * its hash as a new row in account_tokens. Does NOT delete or
 * invalidate any previous tokens for this user -- old rows simply
 * remain, expired and/or unused, matching the table's
 * [userId, type, usedAt] index design. Safe to call multiple times for
 * the same user (e.g. once at registration, again on every "resend").
 *
 * Returns the raw token so the caller can build the verification email
 * URL -- this is the only point in the system where the raw value
 * exists outside of a user's inbox.
 */
export async function createVerificationToken(userId: string): Promise<CreatedVerificationToken> {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.account_tokens.create({
    data: {
      id: crypto.randomUUID(),
      type: AccountTokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt,
      userId,
    },
  });

  return { rawToken, expiresAt };
}

export type ConsumeVerificationTokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "ALREADY_USED" };

/**
 * Validates a raw token presented via a verification link, and -- if
 * valid -- atomically marks the token as used AND sets the user's
 * emailVerifiedAt in a single transaction, so the two can never drift
 * out of sync (e.g. a crash between "mark token used" and "verify the
 * user" leaving the system in an inconsistent state).
 *
 * "Valid" means: a row exists with this hash and
 * type = EMAIL_VERIFICATION, it has not already been used (usedAt is
 * null), and it has not expired (expiresAt is in the future). Each
 * failure mode is reported distinctly so the calling route can show an
 * appropriate message (e.g. "this link already used" vs. "this link
 * expired" vs. "invalid link") without the caller needing to
 * re-derive that distinction itself.
 */
export async function consumeVerificationToken(rawToken: string): Promise<ConsumeVerificationTokenResult> {
  const tokenHash = hashToken(rawToken);

  const tokenRow = await prisma.account_tokens.findUnique({
    where: { tokenHash },
  });

  if (!tokenRow || tokenRow.type !== AccountTokenType.EMAIL_VERIFICATION) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (tokenRow.usedAt !== null) {
    return { ok: false, reason: "ALREADY_USED" };
  }

  if (tokenRow.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }

  await prisma.$transaction([
    prisma.account_tokens.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: tokenRow.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return { ok: true, userId: tokenRow.userId };
}