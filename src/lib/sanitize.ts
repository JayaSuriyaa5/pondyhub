import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes rich-text HTML before it's persisted to the database. This is
 * the actual security boundary for user-generated HTML content (post
 * bodies, comments) — never trust contentEditable output directly, since
 * a malicious client could send arbitrary HTML/JS straight to the API,
 * bypassing the editor UI entirely.
 *
 * Allowed tags are intentionally limited to what RichTextEditor's toolbar
 * can produce, so anything else (script, iframe, style, event handler
 * attributes, etc.) is stripped.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "b", "strong", "i", "em", "u",
      "ul", "ol", "li",
      "blockquote", "a",
      "h1", "h2", "h3",
      "code", "pre",
      "div", "span",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  }).trim();
}
