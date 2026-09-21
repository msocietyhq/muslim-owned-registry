"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AiListingAssist } from "@/components/ai-listing-assist";
import { ListingColorsFields } from "@/components/listing-colors-fields";
import { LocationPicker } from "@/components/location-picker";
import { ListingLinksFields } from "@/components/listing-links-fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { PhotoUploader } from "@/components/photo-uploader";
import { TagPicker } from "@/components/tag-picker";
import { WhatsappFields } from "@/components/whatsapp-fields";
import { SaveToast } from "@/components/save-toast";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
import { parseLatLng, type LatLng } from "@/lib/geo";
import { TERMS_CLAUSE_COUNT, termsClauses } from "@/lib/legal";
import { DESCRIPTION_MAX } from "@/lib/markdown";
import type { ListingAiDraft } from "@/lib/listing-ai";
import { OwnerListingStats } from "@/components/owner-listing-stats";
import {
  emptyListingLinks,
  listingFieldsFromUrls,
  listingUrlsFromFields,
  type ListingLinkValues,
} from "@/lib/listing-urls";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import type { Business, ListingStats, Tag } from "@/lib/types";
import { ui } from "@/lib/ui";

export default function EditBusinessPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, t } = useCopy();
  const clauses = termsClauses(lang);
  const router = useRouter();
  const { user: sessionUser } = useAuthUser();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [uen, setUen] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [links, setLinks] = useState<ListingLinkValues>(emptyListingLinks);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>([]);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [locationMode, setLocationMode] = useState<"online" | "pin">("online");
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [accepted, setAccepted] = useState<boolean[]>(() => clauses.map(() => false));
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");

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
    }
    if (nextTags.length) {
      setSuggestedTagIds(nextTags);
      setTagIds((current) => (current.length ? current : nextTags));
    }
    if (draft.primaryColor) {
      setPrimaryColor(draft.primaryColor);
      setSecondaryColor(draft.secondaryColor || "");
    }
  }

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!sessionUser) return;
    const user = sessionUser;
    setUid(user.uid);
    void (async () => {
      try {
        const data = await api<{
          businesses: Business[];
          stats?: Record<string, ListingStats>;
        }>("/api/businesses");
        const found = data.businesses.find((item) => item.id === id);
        if (!found) {
          setError(t.app.loadError);
        } else {
          setBusiness(found);
          setUen(found.uen || "");
          setRegisteredName(found.registeredName || "");
          setBrandName(found.brandName || "");
          setContactEmail(found.contactEmail || "");
          setWhatsapp(found.whatsapp ? formatWhatsappDisplay(found.whatsapp) : "");
          setWhatsappTemplate(found.whatsappTemplate || "");
          setSummary(found.summary || "");
          setDescription(found.description || "");
          setPhotos(found.photos || []);
          setLinks(listingFieldsFromUrls(found.urls || []));
          setTagIds(found.tagIds || []);
          const nextPin = parseLatLng(found.lat, found.lng);
          setPin(nextPin);
          setLocationMode(nextPin ? "pin" : "online");
          setAddress(found.address || "");
          setPrimaryColor(found.primaryColor || "");
          setSecondaryColor(found.secondaryColor || "");
          setStats(data.stats?.[found.id] || null);
        }
      } catch {
        setError(t.app.loadError);
      } finally {
        setReady(true);
      }
    })();
  }, [id, sessionUser, t.app.loadError]);

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
        })
        .catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(handle);
  }, [brandName, summary, description]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!business) return;
    if (locationMode === "pin" && !pin) {
      setError(t.add.locationNeeded);
      return;
    }
    const needsTerms = business.status === "draft" && !business.termsAcceptedAt;
    if (needsTerms && (accepted.length !== TERMS_CLAUSE_COUNT || !accepted.every(Boolean))) {
      setError(t.add.acceptAll);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const identityLocked =
      business.status === "live" ||
      business.status === "unpublished" ||
      business.status === "pending_activation" ||
      business.status === "removed";
    try {
      const data = await api<{ business: Business }>("/api/businesses", {
        method: "PATCH",
        body: JSON.stringify({
          id: business.id,
          action: "update",
          data: {
            ...(identityLocked ? {} : { uen, registeredName }),
            brandName,
            contactEmail,
            whatsapp,
            whatsappTemplate,
            summary,
            description,
            photos,
            urls: listingUrlsFromFields(links),
            tagIds,
            lat: pin?.lat ?? null,
            lng: pin?.lng ?? null,
            address,
            primaryColor: primaryColor || null,
            secondaryColor: secondaryColor || null,
          },
          ...(needsTerms
            ? {
                acceptTerms: true,
                acceptedClauseCount: TERMS_CLAUSE_COUNT,
                termsCopy: clauses.join("\n"),
              }
            : {}),
        }),
      });
      setBusiness(data.business);
      setPhotos(data.business.photos || []);
      setNotice(
        data.business.status === "pending_review" && business.status === "draft"
          ? t.app.resubmitted
          : data.business.status === "pending_review" && business.status !== "pending_review"
            ? t.app.savedReview
            : t.app.saved,
      );
      setToastKey(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.app.loadError);
    } finally {
      setBusy(false);
    }
  }

  function toggleTag(id: string) {
    setTagIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
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
      <div className={`${ui.shell} ${ui.section}`}>
        <p className={ui.noticeError}>{error || t.app.loadError}</p>
      </div>
    );
  }

  const identityLocked =
    business.status === "live" ||
    business.status === "unpublished" ||
    business.status === "pending_activation" ||
    business.status === "removed";

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.app.edit}</h1>
      <p className="mb-2 leading-relaxed">{business.brandName}</p>
      <OwnerListingStats stats={stats} className="mb-4" />
      <p className={`${ui.small} mb-6 max-w-[54ch]`}>
        {identityLocked ? t.app.editHintLocked : t.app.editHint}
      </p>
      {business.status === "draft" && !business.termsAcceptedAt ? (
        <p className={`${ui.notice} mb-4`}>{t.app.inviteDraftLead}</p>
      ) : null}
      {business.status === "draft" && business.lastAdminNote ? (
        <div className={`${ui.noticeError} mb-4`}>
          <p className="font-semibold">{t.app.rejectedLead}</p>
          <p className="mt-2 whitespace-pre-wrap">{business.lastAdminNote}</p>
        </div>
      ) : null}
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      {notice && notice !== t.app.saved ? <p className={`${ui.notice} mb-4`}>{notice}</p> : null}
      {uid && business.status === "draft" && !business.termsAcceptedAt ? (
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
      <form className={ui.form} onSubmit={onSubmit}>
        <div>
          <label className={ui.label} htmlFor="uen">
            {t.add.uen}
          </label>
          <p className={`${ui.small} mb-1.5`}>{t.add.uenHint}</p>
          {identityLocked ? (
            <p className={`${ui.small} mb-1.5`}>{t.add.identityLockedNow}</p>
          ) : (
            <p className={`${ui.small} mb-1.5`}>{t.add.identityLockNote}</p>
          )}
          <input
            className={ui.input}
            id="uen"
            value={uen}
            onChange={(event) => setUen(event.target.value)}
            required
            readOnly={identityLocked}
            disabled={identityLocked}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="registeredName">
            {t.add.registered}
          </label>
          {identityLocked ? (
            <p className={`${ui.small} mb-1.5`}>{t.add.identityLockedNow}</p>
          ) : (
            <p className={`${ui.small} mb-1.5`}>{t.add.identityLockNote}</p>
          )}
          <input
            className={ui.input}
            id="registeredName"
            value={registeredName}
            onChange={(event) => setRegisteredName(event.target.value)}
            required
            readOnly={identityLocked}
            disabled={identityLocked}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="brandName">
            {t.add.brand}
          </label>
          <input
            className={ui.input}
            id="brandName"
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
            required
          />
        </div>
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
        <div>
          <label className={ui.label} htmlFor="contactEmail">
            {t.add.contact}
          </label>
          <input
            className={ui.input}
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            required
          />
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
        {business.status === "draft" && !business.termsAcceptedAt ? (
          <fieldset>
            <legend className={ui.small}>{t.add.acceptLegend}</legend>
            {clauses.map((clause, index) => (
              <label key={clause} className={`${ui.checkbox} min-h-12 items-start`}>
                <input
                  className={ui.check}
                  type="checkbox"
                  checked={Boolean(accepted[index])}
                  onChange={() =>
                    setAccepted((current) => current.map((item, itemIndex) => (itemIndex === index ? !item : item)))
                  }
                />
                <span>{clause}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <button className={ui.button} type="submit" disabled={busy}>
          {busy
            ? business.status === "draft"
              ? t.app.resubmitting
              : t.app.saving
            : business.status === "draft"
              ? t.app.resubmit
              : t.app.save}
        </button>
      </form>
      {toastKey ? <SaveToast key={toastKey} message={t.app.saved} /> : null}
    </div>
  );
}
