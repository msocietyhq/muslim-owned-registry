"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import {
  emptyListingLinks,
  listingFieldsFromUrls,
  listingUrlsFromFields,
  type ListingLinkValues,
} from "@/lib/listing-urls";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import { DESCRIPTION_MAX } from "@/lib/markdown";
import type { Business, Tag } from "@/lib/types";
import { ui } from "@/lib/ui";

export default function AdminEditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useCopy();
  const router = useRouter();
  const { user: sessionUser, isAdmin } = useAuthUser();
  const [business, setBusiness] = useState<Business | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [uen, setUen] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [links, setLinks] = useState<ListingLinkValues>(emptyListingLinks);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [locationMode, setLocationMode] = useState<"online" | "pin">("online");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [toastKey, setToastKey] = useState(0);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!sessionUser) return;
    if (!isAdmin) {
      setError(t.adminPage.notAdmin);
      setReady(true);
      return;
    }
    setUid(sessionUser.uid);
    void (async () => {
      try {
        const data = await api<{ business: Business }>(`/api/admin/listings?id=${encodeURIComponent(id)}`);
        const found = data.business;
        setBusiness(found);
        setUen(found.uen || "");
        setRegisteredName(found.registeredName || "");
        setBrandName(found.brandName || "");
        setSlug(found.slug || "");
        setContactEmail(found.contactEmail || "");
        setWhatsapp(found.whatsapp ? formatWhatsappDisplay(found.whatsapp) : "");
        setWhatsappTemplate(found.whatsappTemplate || "");
        setSummary(found.summary || "");
        setDescription(found.description || "");
        setPhotos(found.photos || []);
        setLinks(listingFieldsFromUrls(found.urls || []));
        setLinkedinUrl(found.linkedinUrl || "");
        setTagIds(found.tagIds || []);
        const nextPin = parseLatLng(found.lat, found.lng);
        setPin(nextPin);
        setLocationMode(nextPin ? "pin" : "online");
        setAddress(found.address || "");
        setPrimaryColor(found.primaryColor || "");
        setSecondaryColor(found.secondaryColor || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : t.adminPage.loadError);
      } finally {
        setReady(true);
      }
    })();
  }, [id, isAdmin, sessionUser, t.adminPage.loadError, t.adminPage.notAdmin]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!business) return;
    if (locationMode === "pin" && !pin) {
      setError(t.add.locationNeeded);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ business: Business }>("/api/admin/listings", {
        method: "PATCH",
        body: JSON.stringify({
          id: business.id,
          data: {
            uen,
            registeredName,
            brandName,
            slug,
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
            ...(linkedinUrl.trim() || business.linkedinUrl
              ? { linkedinUrl: linkedinUrl.trim() || business.linkedinUrl }
              : {}),
          },
        }),
      });
      setBusiness(data.business);
      setPhotos(data.business.photos || []);
      setSlug(data.business.slug || "");
      setToastKey(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    } finally {
      setBusy(false);
    }
  }

  function toggleTag(tagId: string) {
    setTagIds((current) =>
      current.includes(tagId) ? current.filter((item) => item !== tagId) : [...current, tagId],
    );
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
        <p className={ui.noticeError}>{error || t.adminPage.loadError}</p>
        <p className="mt-4">
          <Link href="/admin" className={ui.link}>
            {t.adminPage.back}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <p className="mb-4">
        <Link href="/admin" className={ui.link}>
          {t.adminPage.back}
        </Link>
      </p>
      <h1 className={ui.h1Wide}>{t.adminPage.editTitle}</h1>
      <p className={`${ui.small} mb-6 max-w-[54ch]`}>{t.adminPage.editHint}</p>
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      <form className={ui.form} onSubmit={onSubmit}>
        <div>
          <label className={ui.label} htmlFor="uen">
            {t.add.uen}
          </label>
          <input className={ui.input} id="uen" value={uen} onChange={(event) => setUen(event.target.value)} required />
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
            required
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
          <label className={ui.label} htmlFor="slug">
            {t.add.slug}
          </label>
          <input className={ui.input} id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        </div>
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
        <div>
          <label className={ui.label} htmlFor="linkedinUrl">
            {t.add.linkedinUrl}
          </label>
          <p className={`${ui.small} mb-1.5`}>{t.add.linkedinHint}</p>
          <input
            className={ui.input}
            id="linkedinUrl"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
          />
        </div>
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
          suggested={[]}
          onToggle={toggleTag}
          labels={{
            legend: t.add.tags,
            hint: t.add.tagsHint,
            suggested: t.add.tagsSuggested,
          }}
        />
        <button className={ui.button} type="submit" disabled={busy}>
          {busy ? t.app.saving : t.app.save}
        </button>
      </form>
      {toastKey ? <SaveToast key={toastKey} message={t.app.saved} /> : null}
    </div>
  );
}
