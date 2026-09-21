"use client";

import { useEffect, useState } from "react";

export function SaveToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(hide);
  }, []);

  if (!visible) return null;

  return (
    <p
      role="status"
      className="fixed bottom-24 left-1/2 z-[60] w-[min(calc(100%-2rem),22rem)] -translate-x-1/2 rounded-full border border-mihrab bg-mihrab px-5 py-3 text-center font-sans text-sm font-semibold text-paper shadow-[0_16px_40px_-16px_rgba(12,63,50,0.8)]"
    >
      {message}
    </p>
  );
}
