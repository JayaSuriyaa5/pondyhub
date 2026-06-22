import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiResponse } from "@/types";

export function apiSuccess<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function apiError(
  message: string,
  status = 400,
  options?: { code?: string; fieldErrors?: Record<string, string[]> }
) {
  const body: ApiResponse<never> = {
    success: false,
    error: {
      message,
      code: options?.code,
      fieldErrors: options?.fieldErrors,
    },
  };
  return NextResponse.json(body, { status });
}

export const apiErrors = {
  unauthorized: () => apiError("You must be logged in to do this.", 401, { code: "UNAUTHORIZED" }),
  forbidden: () => apiError("You don't have permission to do this.", 403, { code: "FORBIDDEN" }),
  notFound: (resource = "Resource") => apiError(`${resource} not found.`, 404, { code: "NOT_FOUND" }),
  conflict: (message: string) => apiError(message, 409, { code: "CONFLICT" }),
  rateLimited: () =>
    apiError("Too many requests. Please slow down and try again shortly.", 429, {
      code: "RATE_LIMITED",
    }),
  internal: () =>
    apiError("Something went wrong on our end. Please try again.", 500, {
      code: "INTERNAL_ERROR",
    }),
};

/**
 * Converts a ZodError into a field-level error map, e.g.
 * { email: ["Invalid email address"], password: ["Too short"] }
 */
export function zodErrorToFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export function apiValidationError(error: ZodError) {
  return apiError("Validation failed.", 422, {
    code: "VALIDATION_ERROR",
    fieldErrors: zodErrorToFieldErrors(error),
  });
}

/**
 * Wraps a route handler body so unexpected thrown errors become a clean
 * 500 JSON response instead of an HTML error page / unhandled rejection.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T | ReturnType<typeof apiError>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    console.error("[API ERROR]", err);
    return apiErrors.internal();
  }
}
