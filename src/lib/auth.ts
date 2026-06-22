import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import type { JwtAccessPayload, JwtRefreshPayload } from "@/types";

// ----------------------------------------------------------------------------
// Environment / secrets
// ----------------------------------------------------------------------------
// We read these lazily (inside functions) rather than at module load time so
// that a missing env var fails loudly when actually used, with a clear
// message, instead of silently producing `undefined` secrets at import time.

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_ACCESS_SECRET is missing or too short. Set it in your environment (.env)."
    );
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_REFRESH_SECRET is missing or too short. Set it in your environment (.env)."
    );
  }
  return secret;
}

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// ----------------------------------------------------------------------------
// Password hashing
// ----------------------------------------------------------------------------

const SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

// ----------------------------------------------------------------------------
// JWT — access token (short-lived, sent on every request)
// ----------------------------------------------------------------------------

export function signAccessToken(payload: {
  id: string;
  username: string;
  role: Role;
}): string {
  const tokenPayload: JwtAccessPayload = {
    sub: payload.id,
    username: payload.username,
    role: payload.role,
  };
  return jwt.sign(tokenPayload, getAccessSecret(), {
    expiresIn: ACCESS_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, getAccessSecret()) as JwtAccessPayload;
}

// ----------------------------------------------------------------------------
// JWT — refresh token (long-lived, stored in httpOnly cookie only)
// ----------------------------------------------------------------------------

export function signRefreshToken(payload: { id: string }): string {
  const tokenPayload: JwtRefreshPayload = { sub: payload.id };
  return jwt.sign(tokenPayload, getRefreshSecret(), {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, getRefreshSecret()) as JwtRefreshPayload;
}

// ----------------------------------------------------------------------------
// Safe verify helpers (return null instead of throwing) — useful in
// middleware / route handlers where we want to fall through to "unauthorized"
// rather than crash the request on an expired/invalid token.
// ----------------------------------------------------------------------------

export function safeVerifyAccessToken(token: string): JwtAccessPayload | null {
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export function safeVerifyRefreshToken(token: string): JwtRefreshPayload | null {
  try {
    return verifyRefreshToken(token);
  } catch {
    return null;
  }
}
