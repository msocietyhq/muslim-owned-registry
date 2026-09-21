"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { OutboundConfirmModal, type OutboundCopy } from "@/components/outbound-confirm-modal";
import { outboundDomain } from "@/lib/outbound";

export type { OutboundCopy };

export function OutboundLink({
  href,
  className,
  children,
  copy,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  copy: OutboundCopy;
}) {
  const [open, setOpen] = useState(false);
  const domain = outboundDomain(href);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!domain) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <a href={href} className={className} rel={domain ? "noreferrer" : undefined} onClick={onClick}>
        {children}
      </a>
      {open && domain ? (
        <OutboundConfirmModal
          domain={domain}
          copy={copy}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            window.open(href, "_blank", "noopener,noreferrer");
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
