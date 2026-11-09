"use client";

import { FormEvent, useEffect, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { ui } from "@/lib/ui";

type PublicKey = {
  id: string;
  name: string;
  prefix: string;
  role: "admin" | "owner";
  email: string;
  createdAt: string;
  revokedAt: string | null;
};

export function ApiKeysPanel({ admin = false }: { admin?: boolean }) {
  const { t } = useCopy();
  const [keys, setKeys] = useState<PublicKey[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "owner">(admin ? "admin" : "owner");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ keys: PublicKey[] }>("/api/api-keys")
      .then((data) => setKeys(data.keys || []))
      .catch((err: Error) => setError(err.message || t.apiKeys.fail));
  }, [t.apiKeys.fail]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setToken("");
    try {
      const data = await api<{ token: string; key: PublicKey }>("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name,
          role: admin ? role : "owner",
          ownerEmail: admin && role === "owner" ? ownerEmail : undefined,
        }),
      });
      setToken(data.token);
      setName("");
      setOwnerEmail("");
      setKeys((current) => [data.key, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.apiKeys.fail);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError("");
    try {
      const data = await api<{ key: PublicKey }>("/api/api-keys", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setKeys((current) => current.map((item) => (item.id === id ? data.key : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.apiKeys.fail);
    }
  }

  return (
    <section className="mt-10 max-w-[62ch]">
      <h2 className={ui.sectionTitle}>{t.apiKeys.title}</h2>
      <p className="leading-relaxed">{t.apiKeys.lead}</p>
      <p className={`${ui.small} mt-2`}>
        {t.apiKeys.docs}{" "}
        <a className={ui.link} href="/api/v1/docs">
          /api/v1/docs
        </a>
      </p>
      {error ? <p className={`${ui.noticeError} mt-4`}>{error}</p> : null}
      {token ? (
        <p className={`${ui.notice} mt-4 break-all`}>
          {t.apiKeys.once} <span className="font-mono">{token}</span>
        </p>
      ) : null}
      <form className={`${ui.form} mt-6`} onSubmit={onSubmit}>
        <div>
          <label className={ui.label} htmlFor="api-key-name">
            {t.apiKeys.name}
          </label>
          <input
            className={ui.input}
            id="api-key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        {admin ? (
          <div>
            <label className={ui.label} htmlFor="api-key-role">
              {t.apiKeys.role}
            </label>
            <select
              className={ui.input}
              id="api-key-role"
              value={role}
              onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "owner")}
            >
              <option value="admin">{t.apiKeys.roleAdmin}</option>
              <option value="owner">{t.apiKeys.roleOwner}</option>
            </select>
          </div>
        ) : null}
        {admin && role === "owner" ? (
          <div>
            <label className={ui.label} htmlFor="api-key-owner">
              {t.apiKeys.ownerEmail}
            </label>
            <input
              className={ui.input}
              id="api-key-owner"
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              required
            />
          </div>
        ) : null}
        <button className={ui.button} type="submit" disabled={busy}>
          {admin && role === "admin" ? t.apiKeys.createAdmin : t.apiKeys.createOwner}
        </button>
      </form>
      {keys.length === 0 ? <p className={`${ui.small} mt-6`}>{t.apiKeys.empty}</p> : null}
      <ul className="mt-6 grid gap-3">
        {keys.map((key) => (
          <li key={key.id} className={ui.card}>
            <p className="font-medium">{key.name}</p>
            <p className={ui.small}>
              {key.role} · {key.email} · {key.prefix}
              {key.revokedAt ? ` · ${t.apiKeys.revoked}` : ""}
            </p>
            {key.revokedAt ? null : (
              <button className={`${ui.buttonSecondary} mt-3`} type="button" onClick={() => revoke(key.id)}>
                {t.apiKeys.revoke}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
