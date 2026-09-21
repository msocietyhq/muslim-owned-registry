"use client";

import { LISTING_LINK_SLOTS, type ListingLinkValues } from "@/lib/listing-urls";
import { ui } from "@/lib/ui";

const PLACEHOLDERS: Record<keyof ListingLinkValues, string> = {
  website: "https://www.example.sg",
  instagram: "https://www.instagram.com/yourpage",
  facebook: "https://www.facebook.com/yourpage",
  tiktok: "https://www.tiktok.com/@yourpage",
};

export function ListingLinksFields(props: {
  values: ListingLinkValues;
  onChange: (next: ListingLinkValues) => void;
  labels: {
    legend: string;
    hint: string;
    website: string;
    instagram: string;
    facebook: string;
    tiktok: string;
  };
}) {
  const names = {
    website: props.labels.website,
    instagram: props.labels.instagram,
    facebook: props.labels.facebook,
    tiktok: props.labels.tiktok,
  };

  return (
    <fieldset className="grid gap-3">
      <legend className={ui.small}>{props.labels.legend}</legend>
      <p className={ui.small}>{props.labels.hint}</p>
      {LISTING_LINK_SLOTS.map((slot) => (
        <div key={slot.id} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
          <label className={`${ui.label} mb-0`} htmlFor={`link-${slot.id}`}>
            {names[slot.id]}
          </label>
          <input
            className={ui.input}
            id={`link-${slot.id}`}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder={PLACEHOLDERS[slot.id]}
            value={props.values[slot.id]}
            onChange={(event) =>
              props.onChange({ ...props.values, [slot.id]: event.target.value })
            }
          />
        </div>
      ))}
    </fieldset>
  );
}
