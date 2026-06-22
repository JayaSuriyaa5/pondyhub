/**
 * Converts a string into a URL-safe slug.
 * e.g. "Web Development!" -> "web-development"
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFKD") // split accented characters into base + diacritic
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric chars
    .replace(/[\s_-]+/g, "-") // collapse whitespace/underscores into single dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

/**
 * Appends a short random suffix to guarantee uniqueness if the base slug
 * is already taken (checked by the caller against the database).
 */
export function slugifyWithSuffix(input: string): string {
  const base = slugify(input);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
