"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import type { AdminAccount } from "@/lib/admin-accounts";
import { ui } from "@/lib/ui";

export function AdminAccounts() {
  const { t } = useCopy();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const data = await api<{ admins: AdminAccount[] }>("/api/admin/accounts");
    setAdmins(data.admins || []);
  }

  useEffect(() => {
    load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    });
  }, [t.adminPage.loadError]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ email: string }>("/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ email, admin: true }),
      });
      setEmail("");
      setNotice(t.adminPage.adminsAdded.replace("{email}", data.email));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(target: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ email: string }>("/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ email: target, admin: false }),
      });
      setNotice(t.adminPage.adminsRemoved.replace("{email}", data.email));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className={ui.sectionTitle}>{t.adminPage.adminsTitle}</h2>
      <p className={`${ui.small} mb-4 max-w-[54ch]`}>{t.adminPage.adminsLead}</p>
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      {notice ? <p className={`${ui.notice} mb-4`}>{notice}</p> : null}
      <form className={`${ui.card} mb-6 grid gap-3`} onSubmit={onAdd}>
        <label>
          <span className={ui.label}>{t.adminPage.adminsEmail}</span>
          <p className={`${ui.small} mb-1.5`}>{t.adminPage.adminsEmailHint}</p>
          <input
            className={ui.input}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button className={ui.button} type="submit" disabled={busy}>
          {t.adminPage.adminsAdd}
        </button>
      </form>
      {admins.length === 0 ? (
        <p className={ui.small}>{t.adminPage.adminsEmpty}</p>
      ) : (
        <ul className="grid gap-3">
          {admins.map((account) => (
            <li
              key={account.email}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule/70 bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-mihrab [overflow-wrap:anywhere]">{account.email}</p>
                {account.you ? <p className={ui.small}>{t.adminPage.adminsYou}</p> : null}
              </div>
              {account.canRemove ? (
                <button
                  type="button"
                  className={ui.buttonSecondary}
                  disabled={busy}
                  onClick={() => void onRemove(account.email)}
                >
                  {t.adminPage.adminsRemove}
                </button>
              ) : (
                <p className={ui.small}>{t.adminPage.adminsSelf}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
