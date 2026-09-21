"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import type { TeamMember } from "@/lib/team";
import { teamInitials } from "@/lib/team";
import { ui } from "@/lib/ui";

export function AdminTeam() {
  const { t } = useCopy();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ members: TeamMember[] }>("/api/admin/team");
    setMembers(data.members || []);
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
    try {
      await api("/api/admin/team", {
        method: "POST",
        body: JSON.stringify({ name, photoUrl, url }),
      });
      setName("");
      setUrl("");
      setPhotoUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/team?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "team");
    const response = await fetch("/api/uploads", { method: "POST", body: form, credentials: "include" });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) throw new Error(data.error || "Could not upload that photo.");
    setPhotoUrl(data.url);
  }

  return (
    <section className="mt-10">
      <h2 className={ui.sectionTitle}>{t.adminPage.teamTitle}</h2>
      <p className={`${ui.small} mb-4 max-w-[54ch]`}>{t.adminPage.teamLead}</p>
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      <form className={`${ui.card} mb-6 grid gap-3`} onSubmit={onAdd}>
        <label>
          <span className={ui.label}>{t.adminPage.teamName}</span>
          <input
            className={ui.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
        </label>
        <label>
          <span className={ui.label}>{t.adminPage.teamPhoto}</span>
          <p className={`${ui.small} mb-2`}>{t.adminPage.teamPhotoHint}</p>
          {photoUrl ? (
            <div className="mb-2 flex items-center gap-3">
              <img src={photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              <button type="button" className={ui.link} onClick={() => setPhotoUrl("")}>
                {t.adminPage.teamDelete}
              </button>
            </div>
          ) : null}
          <input
            className={ui.input}
            type="file"
            accept="image/*"
            onChange={(event) => {
              void onPhoto(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label>
          <span className={ui.label}>{t.adminPage.teamUrl}</span>
          <input
            className={ui.input}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            inputMode="url"
            placeholder="https://"
          />
        </label>
        <button className={ui.button} type="submit" disabled={busy}>
          {t.adminPage.teamAdd}
        </button>
      </form>
      {members.length === 0 ? (
        <p className={ui.small}>{t.adminPage.teamEmpty}</p>
      ) : (
        <ul className="grid gap-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-2xl border border-rule/70 bg-surface p-3"
            >
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf font-sans text-sm font-semibold text-mihrab">
                  {teamInitials(member)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-mihrab">{member.name || t.adminPage.teamNoName}</p>
                {member.url ? (
                  <a className={`${ui.link} block truncate text-sm`} href={member.url} rel="noreferrer">
                    {member.url}
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                className={ui.buttonSecondary}
                disabled={busy}
                onClick={() => void onDelete(member.id)}
              >
                {t.adminPage.teamDelete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
