"use client";

import { FormEvent, useState } from "react";
import { OsmEmbed } from "@/components/osm-embed";
import { api } from "@/lib/api-client";
import { isValidSgPin, parseLatLng, type LatLng } from "@/lib/geo";
import { ADDRESS_MAX } from "@/lib/types";
import { ui } from "@/lib/ui";

type Labels = {
  legend: string;
  hint: string;
  address: string;
  addressHint: string;
  addressPlaceholder: string;
  online: string;
  pin: string;
  search: string;
  searchButton: string;
  searching: string;
  noResults: string;
  here: string;
  chosen: string;
  openMap: string;
};

type GeoHit = LatLng & { label: string };

export function LocationPicker({
  value,
  onChange,
  onModeChange,
  address = "",
  onAddressChange,
  labels,
}: {
  value: LatLng | null;
  onChange: (next: LatLng | null) => void;
  onModeChange?: (mode: "online" | "pin") => void;
  address?: string;
  onAddressChange?: (next: string) => void;
  labels: Labels;
}) {
  const [mode, setMode] = useState<"online" | "pin">(value ? "pin" : "online");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [locateError, setLocateError] = useState("");

  async function onSearch(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setLocateError("");
    try {
      const data = await api<{ results: GeoHit[] }>(
        `/api/geo?q=${encodeURIComponent(query.trim())}`,
      );
      setHits(data.results || []);
      if (!data.results?.length) setLocateError(labels.noResults);
    } catch (error) {
      setHits([]);
      setLocateError(error instanceof Error ? error.message : labels.noResults);
    } finally {
      setBusy(false);
    }
  }

  function useHere() {
    setLocateError("");
    if (!navigator.geolocation) {
      setLocateError(labels.noResults);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = parseLatLng(position.coords.latitude, position.coords.longitude);
        if (!next || !isValidSgPin(next.lat, next.lng)) {
          setLocateError(labels.noResults);
          return;
        }
        setMode("pin");
        onModeChange?.("pin");
        onChange(next);
      },
      () => setLocateError(labels.noResults),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <fieldset className="grid gap-3">
      <legend className={ui.small}>{labels.legend}</legend>
      <p className={ui.small}>{labels.hint}</p>
      <div>
        <label className={ui.label} htmlFor="address">
          {labels.address}
        </label>
        <p className={`${ui.small} mb-1.5`}>{labels.addressHint}</p>
        {onAddressChange ? (
          <input
            className={ui.input}
            id="address"
            name="address"
            maxLength={ADDRESS_MAX}
            placeholder={labels.addressPlaceholder}
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
          />
        ) : (
          <input
            className={ui.input}
            id="address"
            name="address"
            maxLength={ADDRESS_MAX}
            placeholder={labels.addressPlaceholder}
            defaultValue={address}
          />
        )}
      </div>
      <label className={ui.checkbox}>
        <input
          className={ui.check}
          type="radio"
          name="locationMode"
          checked={mode === "online"}
          onChange={() => {
            setMode("online");
            setHits([]);
            onModeChange?.("online");
            onChange(null);
          }}
        />
        {labels.online}
      </label>
      <label className={ui.checkbox}>
        <input
          className={ui.check}
          type="radio"
          name="locationMode"
          checked={mode === "pin"}
          onChange={() => {
            setMode("pin");
            onModeChange?.("pin");
          }}
        />
        {labels.pin}
      </label>
      {mode === "pin" ? (
        <div className="grid gap-3">
          <div className={ui.search}>
            <input
              className={ui.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.search}
              aria-label={labels.search}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onSearch();
                }
              }}
            />
            <button
              className={ui.buttonSecondary}
              type="button"
              disabled={busy || query.trim().length < 3}
              onClick={() => void onSearch()}
            >
              {busy ? labels.searching : labels.searchButton}
            </button>
          </div>
          <button className={ui.buttonSecondary} type="button" onClick={useHere}>
            {labels.here}
          </button>
          {locateError ? <p className={ui.noticeError}>{locateError}</p> : null}
          {hits.length ? (
            <ul className="grid gap-2">
              {hits.map((hit) => (
                <li key={`${hit.lat},${hit.lng},${hit.label}`}>
                  <button
                    type="button"
                    className="min-h-12 w-full rounded-2xl border border-rule bg-surface px-4 py-3 text-left font-sans text-sm hover:border-jade"
                    onClick={() => {
                      onChange({ lat: hit.lat, lng: hit.lng });
                      setHits([]);
                    }}
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {value ? (
            <>
              <p className={ui.small}>
                {labels.chosen} {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </p>
              <OsmEmbed point={value} title={labels.legend} openLabel={labels.openMap} />
            </>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
