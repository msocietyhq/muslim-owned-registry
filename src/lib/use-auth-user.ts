"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSession, type SessionUser } from "@/lib/api-client";

export function useAuthUser(options?: { loginRedirect?: boolean; admin?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readSession()
      .then((session) => {
        if (cancelled) return;
        if (!session.user && options?.loginRedirect !== false) {
          router.replace("/login");
          return;
        }
        setUser(session.user);
        setIsAdmin(session.isAdmin);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled && options?.loginRedirect !== false) router.replace("/login");
        else setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [options?.loginRedirect, router]);

  return { user, isAdmin, ready };
}
