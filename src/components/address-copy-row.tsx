"use client";

import { CopyTextButton } from "@/components/copy-text-button";

export function AddressCopyRow({
  address,
  copyLabel,
  copiedLabel,
}: {
  address: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const text = address.trim();
  if (!text) return null;

  return (
    <div className="mb-4 flex items-start gap-1.5">
      <p className="min-w-0 flex-1 leading-relaxed [overflow-wrap:anywhere]">{text}</p>
      <CopyTextButton text={text} copyLabel={copyLabel} copiedLabel={copiedLabel} className="mt-0.5" />
    </div>
  );
}
