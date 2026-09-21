"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AiListingAssist } from "@/components/ai-listing-assist";
import { ListingColorsFields } from "@/components/listing-colors-fields";
import { LocationPicker } from "@/components/location-picker";
import { ListingLinksFields } from "@/components/listing-links-fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { PhotoUploader } from "@/components/photo-uploader";
import { TagPicker } from "@/components/tag-picker";
import { WhatsappFields } from "@/components/whatsapp-fields";
import { LISTING_WIZARD_STEPS, wizardStepLabel } from "@/lib/listing-wizard";
import { ListingWizardChrome, ListingWizardNav } from "@/components/listing-wizard";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
import type { LatLng } from "@/lib/geo";
import { TERMS_CLAUSE_COUNT, termsClauses } from "@/lib/legal";
import {
  isListingDraftEmpty,
  type ListingDraft,
  type ListingDraftFields,
} from "@/lib/listing-draft";
import type { ListingAiDraft } from "@/lib/listing-ai";
import {
  emptyListingLinks,
  listingUrlsFromFields,
  type ListingLinkValues,
} from "@/lib/listing-urls";
import { DESCRIPTION_MAX } from "@/lib/markdown";
import type { Tag, VerificationType } from "@/lib/types";
import { ui } from "@/lib/ui";

export default function NewBusinessPage() {
  const { lang, t } = useCopy();
  const router = useRouter();
  const { user } = useAuthUser();
  const uid = user?.uid || null;
  const clauses = termsClauses(lang);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const skipSave = useRef(true);
  const [displayName, setDisplayName] = useState("");
  const [uen, setUen] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [summary, setSummary] = useState("");
  const [step, setStep] = useState(0);
  const [verificationType, setVerificationType] =
    useState<VerificationType>("linkedin");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [accepted, setAccepted] = useState<boolean[]>(() => clauses.map(() => false));
  const [pin, setPin] = useState<LatLng | null>(null);
  const [locationMode, setLocationMode] = useState<"online" | "pin">("online");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [foundingOpen, setFoundingOpen] = useState(false);
  const [askOwnerName, setAskOwnerName] = useState(false);
  const [links, setLinks] = useState<ListingLinkValues>(emptyListingLinks);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>([]);
  const [tagsTouched, setTagsTouched] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");

  function draftPayload(): ListingDraftFields {
    return {
      displayName,
      uen,
      registeredName,
      brandName,
      slug: "",
      contactEmail,
      whatsapp,
      whatsappTemplate,
      summary,
      description,
      photos,
      links,
      tagIds,
      tagsTouched,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
      address,
      locationMode,
      verificationType,
      linkedinUrl,
      primaryColor,
      secondaryColor,
    };
  }

  function applyAiDraft(draft: ListingAiDraft, nextTags: string[]) {
    if (draft.uen) setUen(draft.uen);
    if (draft.registeredName) setRegisteredName(draft.registeredName);
    if (draft.brandName) setBrandName(draft.brandName);
    if (draft.contactEmail) setContactEmail(draft.contactEmail);
    if (draft.whatsapp) setWhatsapp(draft.whatsapp);
    if (draft.summary) setSummary(draft.summary);
    if (draft.description) setDescription(draft.description);
    if (draft.photos.length) setPhotos(draft.photos);
    setLinks((current) => ({
      website: draft.links.website || current.website,
      instagram: draft.links.instagram || current.instagram,
      facebook: draft.links.facebook || current.facebook,
      tiktok: draft.links.tiktok || current.tiktok,
    }));
    if (draft.address) setAddress(draft.address);
    if (draft.lat != null && draft.lng != null) {
      setPin({ lat: draft.lat, lng: draft.lng });
      setLocationMode("pin");
    } else if (draft.locationMode === "online") {
      setLocationMode("online");
    }
    if (nextTags.length && !tagsTouched) {
      setTagIds(nextTags);
      setSuggestedTagIds(nextTags);
    }
    if (draft.primaryColor) {
      setPrimaryColor(draft.primaryColor);
      setSecondaryColor(draft.secondaryColor || "");
    }
  }

  function applyDraft(draft: ListingDraft) {
    setDisplayName(draft.displayName);
    setUen(draft.uen);
    setRegisteredName(draft.registeredName);
    setBrandName(draft.brandName);
    setContactEmail(draft.contactEmail);
    setWhatsapp(draft.whatsapp);
    setWhatsappTemplate(draft.whatsappTemplate);
    setSummary(draft.summary);
    setDescription(draft.description);
    setPhotos(draft.photos);
    setLinks(draft.links);
    setTagIds(draft.tagIds);
    setTagsTouched(draft.tagsTouched || draft.tagIds.length > 0);
    const nextPin =
      draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : null;
    setPin(nextPin);
    setLocationMode(draft.locationMode === "pin" || nextPin ? "pin" : "online");
    setAddress(draft.address);
    setVerificationType(draft.verificationType);
    setLinkedinUrl(draft.linkedinUrl);
    setPrimaryColor(draft.primaryColor || "");
    setSecondaryColor(draft.secondaryColor || "");
  }

  useEffect(() => {
    setAccepted(termsClauses(lang).map(() => false));
  }, [lang]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []));
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    Promise.all([
      api<{ businesses?: unknown[] }>("/api/businesses")
        .then((data) => setAskOwnerName((data.businesses || []).length === 0))
        .catch(() => setAskOwnerName(false)),
      api<{ draft: ListingDraft | null }>("/api/listing-draft")
        .then((data) => {
          if (cancelled || !data.draft) return;
          applyDraft(data.draft);
          if (!isListingDraftEmpty(data.draft)) setRestored(true);
        })
        .catch(() => undefined),
    ]).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.foundingClaimed === "number" && data.foundingClaimed < 100) {
          setFoundingOpen(true);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    const text = `${brandName} ${summary} ${description}`.trim();
    if (text.length < 8) {
      setSuggestedTagIds([]);
      return;
    }
    const handle = window.setTimeout(() => {
      api<{ tagIds?: string[] }>("/api/tags/suggest", {
        method: "POST",
        body: JSON.stringify({ brandName, summary, description }),
      })
        .then((data) => {
          const ids = Array.isArray(data.tagIds) ? data.tagIds.map(String) : [];
          setSuggestedTagIds(ids);
          if (!tagsTouched) setTagIds(ids);
        })
        .catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(handle);
  }, [brandName, summary, description, tagsTouched]);

  useEffect(() => {
    if (!ready || !uid) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      api<{ draft: ListingDraft | null }>("/api/listing-draft", {
        method: "PUT",
        body: JSON.stringify(draftPayload()),
      })
        .then((data) => setDraftSavedAt(data.draft?.updatedAt || null))
        .catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(handle);
    // Form fields are the draft; listing every value keeps one draft per owner in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    uid,
    displayName,
    uen,
    registeredName,
    brandName,
    contactEmail,
    whatsapp,
    whatsappTemplate,
    summary,
    description,
    photos,
    links,
    tagIds,
    tagsTouched,
    pin,
    address,
    locationMode,
    verificationType,
    linkedinUrl,
    primaryColor,
    secondaryColor,
  ]);

  const autoSlug = useMemo(
    () =>
      brandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    [brandName],
  );

  const allAccepted = accepted.length === TERMS_CLAUSE_COUNT && accepted.every(Boolean);

  function toggleTag(id: string) {
    setTagsTouched(true);
    setTagIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (step < LISTING_WIZARD_STEPS - 1) {
      event.preventDefault();
      if (event.currentTarget.reportValidity()) setStep((current) => current + 1);
      return;
    }
    event.preventDefault();
    if (!uid) return;
    if (!allAccepted) {
      setError(t.add.acceptAll);
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      let uenStoragePath: string | null = null;
      if (verificationType === "uen_document") {
        const file = form.get("uenFile") as File | null;
        if (!file || !file.size) throw new Error(t.add.fileNeeded);
        const upload = new FormData();
        upload.append("file", file);
        upload.append("kind", "uen");
        const uploaded = await fetch("/api/uploads", { method: "POST", body: upload, credentials: "include" });
        const payload = (await uploaded.json()) as { path?: string; error?: string };
        if (!uploaded.ok || !payload.path) throw new Error(payload.error || t.add.fileNeeded);
        uenStoragePath = payload.path;
      }

      const urls = listingUrlsFromFields(links);
      if (locationMode === "pin" && !pin) {
        throw new Error(t.add.locationNeeded);
      }

      await api("/api/businesses", {
        method: "POST",
        body: JSON.stringify({
          ...(askOwnerName ? { displayName } : {}),
          uen,
          registeredName,
          brandName,
          contactEmail,
          whatsapp,
          whatsappTemplate,
          summary,
          description,
          photos,
          urls,
          tagIds,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
          address,
          verificationType,
          linkedinUrl: linkedinUrl || null,
          uenStoragePath,
          primaryColor: primaryColor || null,
          secondaryColor: secondaryColor || null,
          acceptTerms: true,
          acceptedClauseCount: TERMS_CLAUSE_COUNT,
          termsCopy: clauses.join("\n"),
        }),
      });
      router.push("/app?submitted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className={`${ui.shell} ${ui.section}`}>
        <p>{t.add.draftLoading}</p>
      </div>
    );
  }

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.add.title}</h1>
      <p className="mb-6 leading-relaxed">{t.add.lead}</p>
      {foundingOpen ? (
        <div className="mb-6 rounded-2xl border border-gold/50 bg-gold/25 px-4 py-3">
          <p className="font-sans text-sm font-semibold text-mihrab">{t.add.foundingTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{t.add.foundingBody}</p>
        </div>
      ) : null}
      {restored ? <p className={`${ui.notice} mb-4`}>{t.add.draftRestored}</p> : null}
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      <form className={ui.form} onSubmit={onSubmit}>
        <ListingWizardChrome
          step={step}
          total={LISTING_WIZARD_STEPS}
          nudge={t.add.wizardNudges[step] || ""}
          title={t.add.wizardTitles[step] || ""}
          stepLabel={wizardStepLabel(t.add.wizardStep, step + 1, LISTING_WIZARD_STEPS)}
        />
        <div className={step === 0 ? "grid gap-4" : "hidden"}>
          {uid ? (
            <AiListingAssist
              uid={uid}
              photos={photos}
              onPhotosChange={setPhotos}
              onDraft={applyAiDraft}
              labels={{
                open: t.add.aiOpen,
                close: t.add.aiClose,
                title: t.add.aiTitle,
                lead: t.add.aiLead,
                website: t.add.aiWebsite,
                fill: t.add.aiFill,
                busy: t.add.aiBusy,
                done: t.add.aiDone,
              }}
              photoLabels={{
                title: t.add.photos,
                hint: t.add.aiPhotosHint,
                remove: t.add.photosRemove,
                earlier: t.add.photosEarlier,
                later: t.add.photosLater,
              }}
            />
          ) : null}
          {askOwnerName ? (
            <div>
              <label className={ui.label} htmlFor="displayName">
                {t.add.ownerName}
              </label>
              <p className={`${ui.small} mb-1.5`}>{t.add.ownerNameHint}</p>
              <input
                className={ui.input}
                id="displayName"
                name="displayName"
                required={step === 0}
                minLength={2}
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
          ) : null}
          <div>
            <label className={ui.label} htmlFor="brandName">
              {t.add.brand}
            </label>
            <input
              className={ui.input}
              id="brandName"
              name="brandName"
              required={step === 0}
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
            />
          </div>
        </div>
        <div className={step === 1 ? "grid gap-4" : "hidden"}>
          <div className={ui.formTwo}>
            <div>
              <label className={ui.label} htmlFor="uen">
                {t.add.uen}
              </label>
              <p className={`${ui.small} mb-1.5`}>{t.add.uenHint}</p>
              <input
                className={ui.input}
                id="uen"
                name="uen"
                required={step === 1}
                placeholder="201234567A"
                value={uen}
                onChange={(event) => setUen(event.target.value)}
              />
              <p className={`${ui.small} mt-1.5`}>{t.add.identityLockNote}</p>
            </div>
            <div>
              <label className={ui.label} htmlFor="registeredName">
                {t.add.registered}
              </label>
              <input
                className={ui.input}
                id="registeredName"
                name="registeredName"
                required={step === 1}
                value={registeredName}
                onChange={(event) => setRegisteredName(event.target.value)}
              />
              <p className={`${ui.small} mt-1.5`}>{t.add.identityLockNote}</p>
            </div>
          </div>
        </div>
        <div className={step === 2 ? "grid gap-4" : "hidden"}>
          <div>
            <p className={ui.label}>{t.add.slug}</p>
            <p className="min-h-12 w-full rounded-2xl border border-rule bg-leaf px-4 py-3 font-sans text-base text-ink" aria-live="polite">
              /biz/{autoSlug || "brand-name"}
            </p>
            <p className={`${ui.small} mt-1.5`}>{t.add.slugHint}</p>
          </div>
          <div>
            <label className={ui.label} htmlFor="summary">
              {t.add.summary}
            </label>
            <textarea
              className={ui.textarea}
              id="summary"
              name="summary"
              maxLength={280}
              value={summary}
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
            <p className={`${ui.small} mt-2`}>
              {description.length} / {DESCRIPTION_MAX}
            </p>
          </div>
          {uid ? (
            <PhotoUploader
              uid={uid}
              photos={photos}
              onChange={setPhotos}
              labels={{
                title: t.add.photos,
                hint: t.add.photosHint,
                remove: t.add.photosRemove,
                earlier: t.add.photosEarlier,
                later: t.add.photosLater,
              }}
            />
          ) : null}
          <ListingColorsFields
            primary={primaryColor}
            secondary={secondaryColor}
            onPrimaryChange={setPrimaryColor}
            onSecondaryChange={setSecondaryColor}
            labels={{
              legend: t.add.colors,
              hint: t.add.colorsHint,
              primary: t.add.colorsPrimary,
              primaryHint: t.add.colorsPrimaryHint,
              secondary: t.add.colorsSecondary,
              secondaryHint: t.add.colorsSecondaryHint,
              clear: t.add.colorsClear,
              unset: t.add.colorsUnset,
            }}
          />
          <TagPicker
            tags={tags}
            selected={tagIds}
            suggested={suggestedTagIds}
            onToggle={toggleTag}
            labels={{
              legend: t.add.tags,
              hint: t.add.tagsHint,
              suggested: t.add.tagsSuggested,
            }}
          />
        </div>
        <div className={step === 3 ? "grid gap-4" : "hidden"}>
          <div>
            <label className={ui.label} htmlFor="contactEmail">
              {t.add.contact}
            </label>
            <input
              className={ui.input}
              id="contactEmail"
              name="contactEmail"
              type="email"
              required={step === 3}
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
            <p className={`${ui.small} mt-1.5`}>{t.add.contactHint}</p>
          </div>
          <WhatsappFields
            number={whatsapp}
            template={whatsappTemplate}
            onNumberChange={setWhatsapp}
            onTemplateChange={setWhatsappTemplate}
            labels={{
              number: t.add.whatsapp,
              numberHint: t.add.whatsappHint,
              numberPlaceholder: t.add.whatsappPlaceholder,
              template: t.add.whatsappTemplate,
              templateHint: t.add.whatsappTemplateHint,
            }}
          />
          <ListingLinksFields
            values={links}
            onChange={setLinks}
            labels={{
              legend: t.add.urls,
              hint: t.add.urlsHint,
              website: t.add.urlWebsite,
              instagram: t.add.urlInstagram,
              facebook: t.add.urlFacebook,
              tiktok: t.add.urlTikTok,
            }}
          />
          <LocationPicker
            value={pin}
            onChange={setPin}
            onModeChange={setLocationMode}
            address={address}
            onAddressChange={setAddress}
            labels={{
              legend: t.add.location,
              hint: t.add.locationHint,
              online: t.add.online,
              pin: t.add.pin,
              search: t.add.locationSearch,
              searchButton: t.add.locationSearchButton,
              searching: t.add.locationSearching,
              noResults: t.add.locationNone,
              here: t.add.locationHere,
              chosen: t.add.locationChosen,
              address: t.add.address,
              addressHint: t.add.addressHint,
              addressPlaceholder: t.add.addressPlaceholder,
              openMap: t.add.openOsm,
            }}
          />
        </div>
        <div className={step === 4 ? "grid gap-4" : "hidden"}>
          <fieldset>
            <legend className={ui.small}>{t.add.evidence}</legend>
            <label className={`${ui.checkbox} min-h-12 items-center`}>
              <input
                className={ui.check}
                type="radio"
                name="verificationType"
                checked={verificationType === "linkedin"}
                onChange={() => setVerificationType("linkedin")}
              />
              {t.add.linkedin}
            </label>
            <label className={`${ui.checkbox} min-h-12 items-center`}>
              <input
                className={ui.check}
                type="radio"
                name="verificationType"
                checked={verificationType === "uen_document"}
                onChange={() => setVerificationType("uen_document")}
              />
              {t.add.uenDoc}
            </label>
          </fieldset>
          <div className={verificationType === "uen_document" ? undefined : "hidden"}>
            <label className={ui.label} htmlFor="uenFile">
              {t.add.file}
            </label>
            <p className={`${ui.small} mb-1.5`}>{t.add.fileHint}</p>
            <p className={`${ui.small} mb-1.5`}>{t.add.fileRestore}</p>
            <input
              className={ui.input}
              id="uenFile"
              name="uenFile"
              type="file"
              accept="application/pdf,image/*"
            />
          </div>
          <div className={verificationType === "linkedin" ? undefined : "hidden"}>
            <label className={ui.label} htmlFor="linkedinUrl">
              {t.add.linkedinUrl}
            </label>
            <p className={`${ui.small} mb-1.5`}>{t.add.linkedinHint}</p>
            <input
              className={ui.input}
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              required={step === 4 && verificationType === "linkedin"}
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
            />
          </div>
          <fieldset className="grid gap-3">
            <legend className={ui.small}>{t.add.acceptLegend}</legend>
            {clauses.map((clause, index) => (
              <label key={clause} className={`${ui.checkbox} rounded-2xl border border-rule bg-surface px-4 py-3`}>
                <input
                  className={`${ui.check} mt-1 h-6 w-6 min-h-6 min-w-6`}
                  type="checkbox"
                  checked={Boolean(accepted[index])}
                  onChange={(event) =>
                    setAccepted((current) =>
                      current.map((value, itemIndex) =>
                        itemIndex === index ? event.target.checked : value,
                      ),
                    )
                  }
                  required={step === 4}
                />
                <span className="text-base leading-relaxed [overflow-wrap:anywhere]">{clause}</span>
              </label>
            ))}
          </fieldset>
        </div>
        {draftSavedAt ? <p className={ui.small}>{t.add.draftSaved}</p> : null}
        <ListingWizardNav
          step={step}
          isLast={step === LISTING_WIZARD_STEPS - 1}
          busy={busy}
          backLabel={t.add.wizardBack}
          nextLabel={t.add.wizardNext}
          submitLabel={busy ? t.add.submitting : t.add.submit}
          onBack={() => setStep((current) => Math.max(0, current - 1))}
          submitDisabled={!allAccepted}
        />
      </form>
    </div>
  );
}
