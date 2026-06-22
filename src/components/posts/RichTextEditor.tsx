"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: string;
  minHeight?: number;
}

interface ToolbarAction {
  label: string;
  command: string;
  value?: string;
  icon: React.ReactNode;
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "Bold", command: "bold", icon: <Icon d="M6 4h7a3.5 3.5 0 010 7H6zM6 11h8a3.5 3.5 0 010 7H6z" /> },
  { label: "Italic", command: "italic", icon: <Icon d="M10 4h6M8 20h6M14 4L10 20" /> },
  { label: "Underline", command: "underline", icon: <Icon d="M6 4v7a6 6 0 0012 0V4M4 20h16" /> },
  { label: "Bullet list", command: "insertUnorderedList", icon: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /> },
  { label: "Numbered list", command: "insertOrderedList", icon: <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 14h1.5a1 1 0 010 2H4h2" /> },
  { label: "Quote", command: "formatBlock", value: "blockquote", icon: <Icon d="M7 7h4v4l-2 6H6l1.5-6H7V7zm10 0h4v4l-2 6h-3l1.5-6H17V7z" /> },
  { label: "Link", command: "createLink", icon: <Icon d="M9 15l6-6M11 7l1.5-1.5a3 3 0 114.2 4.2L15 11M13 17l-1.5 1.5a3 3 0 11-4.2-4.2L9 13" /> },
];

/**
 * A lightweight WYSIWYG rich text editor built on contentEditable +
 * document.execCommand, avoiding a heavy third-party editor dependency.
 * execCommand is deprecated in spec terms but remains broadly supported
 * across evergreen browsers for these basic formatting commands, and is
 * the pragmatic choice for an MVP that needs bold/italic/lists/links
 * without a large bundle. Output HTML is sanitized server-side (see
 * isomorphic-dompurify usage in the post API) before being trusted for
 * storage or display to other users.
 */
export function RichTextEditor({ value, onChange, placeholder, error, minHeight = 220 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [isFocused, setIsFocused] = useState(false);
  const lastExternalValue = useRef(value);

  // Sync external value changes (e.g. loading a post for editing) into the
  // editable surface, without clobbering the user's cursor on every
  // keystroke (we only sync when `value` changes from *outside* this
  // component, tracked via lastExternalValue).
  useEffect(() => {
    if (editorRef.current && value !== lastExternalValue.current) {
      editorRef.current.innerHTML = value;
      lastExternalValue.current = value;
      setIsEmpty(!value || value === "<br>");
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastExternalValue.current = html;
    onChange(html);
    setIsEmpty(editorRef.current.textContent?.trim().length === 0);
  }, [onChange]);

  function runCommand(action: ToolbarAction) {
    editorRef.current?.focus();
    if (action.command === "createLink") {
      const url = window.prompt("Enter a URL");
      if (!url) return;
      document.execCommand("createLink", false, url);
    } else if (action.value) {
      document.execCommand(action.command, false, action.value);
    } else {
      document.execCommand(action.command, false);
    }
    handleInput();
  }

  return (
    <div>
      <div
        className={clsx(
          "overflow-hidden rounded-xl border bg-coastal-shell transition-shadow dark:bg-abyss-900",
          error
            ? "border-red-400"
            : isFocused
            ? "border-coastal-ocean ring-2 ring-coastal-ocean/20"
            : "border-slate-200 dark:border-abyss-700"
        )}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-brand-50/40 p-1.5 dark:border-abyss-700 dark:bg-abyss-800/40">
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              onClick={() => runCommand(action)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-coastal-ocean dark:text-slate-300 dark:hover:bg-abyss-700 dark:hover:text-brand-300"
            >
              {action.icon}
            </button>
          ))}
        </div>

        {/* Editable surface */}
        <div className="relative">
          {isEmpty && placeholder && (
            <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400 dark:text-slate-500">
              {placeholder}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="prose-content px-4 py-3 text-sm focus:outline-none"
            style={{ minHeight }}
            suppressContentEditableWarning
          />
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
