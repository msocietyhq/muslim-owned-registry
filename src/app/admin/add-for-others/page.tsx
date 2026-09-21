"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiListingAssist } from "@/components/ai-listing-assist";
import { ListingColorsFields } from "@/components/listing-colors-fields";
import { LocationPicker } from "@/components/location-picker";
import { ListingLinksFields } from "@/components/listing-links-fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { PhotoUploader } from "@/components/photo-uploader";
import { TagPicker } from "@/components/tag-picker";
import { WhatsappFields } from "@/components/whatsapp-fields";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
import type { LatLng } from "@/lib/geo";
import type { ListingAiDraft } from "@/lib/listing-ai";
import {
  emptyListingLinks,
  listingUrlsFromFields,
  type ListingLinkValues,
} from "@/lib/listing-urls";
import { DESCRIPTION_MAX } from "@/lib/markdown";
import type { Tag } from "@/lib/types";
import { ui } from "@/lib/ui";

export default function AddForOthersPage() {
  const { t } = useCopy();
  const router = useRouter();
  const { user: sessionUser, isAdmin } = useAuthUser();
  const [uid, setUid] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
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
  const [tagsTouched, setTagsTouched] = useState(false);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [locationMode, setLocationMode] = useState<"online" | "pin">("online");
  const [address, setAddress] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionUser) return;
    if (!isAdmin) {
      setError(t.adminPage.notAdmin);
      return;
    }
    setUid(sessionUser.uid);
  }, [isAdmin, sessionUser, t.adminPage.notAdmin]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => undefined);
  }, []);

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
    if (nextTags.length && !tagsTouched) {
      setTagIds(nextTags);
      setSuggestedTagIds(nextTags);
    }
    if (draft.primaryColor) {
      setPrimaryColor(draft.primaryColor);
      setSecondaryColor(draft.secondaryColor || "");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (locationMode === "pin" && !pin) {
      setError(t.add.locationNeeded);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ ownerEmail: string }>("/api/admin/listings/for-others", {
        method: "POST",
        body: JSON.stringify({
          ownerEmail,
          displayName: displayName || undefined,
          uen,
          registeredName,
          brandName,
          contactEmail: contactEmail || ownerEmail,
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
        }),
      });
      setNotice(t.adminPage.addForOthersSent.replace("{email}", data.ownerEmail));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <p className="mb-4">
        <Link className={ui.link} href="/admin">
          {t.adminPage.back}
        </Link>
      </p>
      <h1 className={ui.h1Wide}>{t.adminPage.addForOthersTitle}</h1>
      <p className="mb-6 leading-relaxed">{t.adminPage.addForOthersLead}</p>
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      {notice ? <p className={`${ui.notice} mb-4`}>{notice}</p> : null}
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
      <form className={ui.form} onSubmit={onSubmit}>
        <div>
          <label className={ui.label} htmlFor="ownerEmail">
            {t.adminPage.addForOthersEmail}
          </label>
          <p className={`${ui.small} mb-1.5`}>{t.adminPage.addForOthersEmailHint}</p>
          <input
            className={ui.input}
            id="ownerEmail"
            type="email"
            required
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="displayName">
            {t.add.ownerName}
          </label>
          <input
            className={ui.input}
            id="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
          />
        </div>
        <div className={ui.formTwo}>
          <div>
            <label className={ui.label} htmlFor="uen">
              {t.add.uen}
            </label>
            <input className={ui.input} id="uen" value={uen} onChange={(event) => setUen(event.target.value)} />
          </div>
          <div>
            <label className={ui.label} htmlFor="registeredName">
              {t.add.registered}
            </label>
            <input
              className={ui.input}
              id="registeredName"
              value={registeredName}
              onChange={(event) => setRegisteredName(event.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={ui.label} htmlFor="brandName">
            {t.add.brand}
          </label>
          <input
            className={ui.input}
            id="brandName"
            required
            minLength={2}
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
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
            placeholder={ownerEmail}
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
            maxLength={280}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </div>
        <div>
          <label className={ui.label}>{t.add.description}</label>
          <MarkdownEditor
            markdown={description}
            onChange={(value) => setDescription(value.slice(0, DESCRIPTION_MAX))}
            placeholder={t.add.descriptionHint}
          />
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
          onToggle={(id) => {
            setTagsTouched(true);
            setTagIds((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            );
          }}
          labels={{
            legend: t.add.tags,
            hint: t.add.tagsHint,
            suggested: t.add.tagsSuggested,
          }}
        />
        <button className={ui.button} type="submit" disabled={busy || !uid}>
          {t.adminPage.addForOthersSubmit}
        </button>
      </form>
    </div>
  );
}
