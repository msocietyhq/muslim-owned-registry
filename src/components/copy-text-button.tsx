"use client";

import { useState } from "react";

export function CopyTextButton({
  text,
  copyLabel,
  copiedLabel,
  className = "",
  compact = false,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const value = text.trim();
  if (!value) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-jade hover:bg-leaf ${compact ? "h-6 w-6" : "h-8 w-8"} ${className}`}
      aria-label={copied ? copiedLabel : copyLabel}
      onClick={() => void onCopy()}
    >
      {copied ? (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
