/**
 * Strips HTML tags from rich-text content to produce a safe plain-text
 * preview (used in post cards / feed rows). This is a simple regex-based
 * strip for preview purposes only — it is NOT a sanitizer and must never
 * be used to decide what's safe to render as HTML. Actual HTML rendering
 * of post/comment content goes through isomorphic-dompurify on the
 * server or in the component that renders raw HTML (see RichTextEditor's
 * companion render path).
 */
export function stripHtmlForPreview(html: string, maxLength = 220): string {
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}
