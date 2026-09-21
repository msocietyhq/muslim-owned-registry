"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";
import { PhotoOrderList } from "@/components/photo-uploader";
import { SaveToast } from "@/components/save-toast";
import { useCopy } from "@/components/i18n-provider";
import { DESCRIPTION_MAX } from "@/lib/markdown";
import { MAX_PHOTOS } from "@/lib/photos";
import { ui } from "@/lib/ui";

type ManageBusiness = {
  id: string;
  brandName: string;
  slug: string;
  status: string;
  summary: string;
  description: string;
  photos: string[];
};

export default function ManageListingPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useCopy();
  const [business, setBusiness] = useState<ManageBusiness | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    fetch(`/api/listing-mail?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.manage.expired);
        return data.business as ManageBusiness;
      })
      .then((found) => {
        setBusiness(found);
        setSummary(found.summary || "");
        setDescription(found.description || "");
        setPhotos(found.photos || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t.manage.expired))
      .finally(() => setReady(true));
  }, [token, t.manage.expired]);

  async function submit(action: "activate" | "confirm" | "update") {
    if (!business) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("action", action);
      form.set("summary", summary);
      form.set("description", description);
      form.set("photos", JSON.stringify(photos));
      for (const file of pendingFiles) form.append("photoFiles", file);
      const res = await fetch("/api/listing-mail", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.manage.expired);
      const next = data.business as ManageBusiness;
      setBusiness(next);
      setPhotos(next.photos || []);
      setPendingFiles([]);
      setNotice(action === "activate" ? t.manage.activated : t.manage.saved);
      setToastKey(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.manage.expired);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(business?.status === "pending_activation" ? "activate" : "update");
  }

  if (!ready) {
    return (
      <div className={`${ui.shell} ${ui.section}`}>
        <p>{t.app.loading}</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
        <h1 className={ui.h1Wide}>{t.manage.title}</h1>
        <p className={`${ui.noticeError} mt-4`}>{error || t.manage.expired}</p>
      </div>
    );
  }

  const needsActivate = business.status === "pending_activation";

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{needsActivate ? t.manage.activateTitle : t.manage.confirmTitle}</h1>
      <p className="mb-6 leading-relaxed">
        {needsActivate ? t.manage.activateLead : t.manage.confirmLead}
      </p>
      <p className="mb-6 font-display text-2xl text-mihrab">{business.brandName}</p>
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      {notice && notice !== t.manage.saved ? <p className={`${ui.notice} mb-4`}>{notice}</p> : null}
      <form className={ui.form} onSubmit={onSubmit}>
        <div>
          <label className={ui.label} htmlFor="summary">
            {t.add.summary}
          </label>
          <textarea
            className={ui.textarea}
            id="summary"
            value={summary}
            maxLength={280}
            onChange={(event) => setSummary(event.target.value)}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="description">
            {t.add.description}
          </label>
          <p className={`${ui.small} mb-2`}>{t.add.descriptionHint}</p>
          <MarkdownEditor
            markdown={description}
            onChange={(value) => setDescription(value.slice(0, DESCRIPTION_MAX))}
            placeholder={t.add.descriptionHint}
          />
        </div>
        <div>
          <p className={ui.label}>{t.add.photos}</p>
          <p className={`${ui.small} mb-2`}>{t.add.photosHint}</p>
          <PhotoOrderList
            photos={photos}
            onChange={setPhotos}
            labels={{
              remove: t.add.photosRemove,
              earlier: t.add.photosEarlier,
              later: t.add.photosLater,
            }}
          />
          {photos.length + pendingFiles.length < MAX_PHOTOS ? (
            <input
              className={ui.input}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                setPendingFiles((current) =>
                  [...current, ...files].slice(0, MAX_PHOTOS - photos.length),
                );
                event.target.value = "";
              }}
            />
          ) : null}
          {pendingFiles.length ? (
            <p className={`${ui.small} mt-2`}>
              {pendingFiles.map((file) => file.name).join(", ")}
            </p>
          ) : null}
        </div>
        <div className={ui.ctaRow}>
          {needsActivate ? (
            <button className={ui.button} type="submit" disabled={busy}>
              {busy ? t.manage.activating : t.manage.activate}
            </button>
          ) : (
            <>
              <button
                className={ui.button}
                type="button"
                disabled={busy}
                onClick={() => void submit("confirm")}
              >
                {busy ? t.manage.confirming : t.manage.confirm}
              </button>
              <button className={ui.buttonSecondary} type="submit" disabled={busy}>
                {busy ? t.app.saving : t.manage.update}
              </button>
            </>
          )}
        </div>
      </form>
      {toastKey ? (
        <SaveToast
          key={toastKey}
          message={notice === t.manage.activated ? t.manage.activated : t.manage.saved}
        />
      ) : null}
    </div>
  );
}
