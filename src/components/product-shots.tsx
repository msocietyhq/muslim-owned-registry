import type { ReactNode } from "react";

type ShotBusiness = {
  brandName: string;
  registeredName: string;
  summary?: string;
  tag?: string;
};

const SAMPLE: ShotBusiness[] = [
  {
    brandName: "Saffron Kitchen",
    registeredName: "Saffron Kitchen Pte Ltd",
    summary: "Kenduri catering from Jurong West.",
    tag: "Catering",
  },
  {
    brandName: "Nur Hall",
    registeredName: "Nur Spaces LLP",
    summary: "A family hall in Tampines.",
    tag: "Venues",
  },
  {
    brandName: "Tampines Prints",
    registeredName: "Tampines Prints Pte Ltd",
    summary: "Invitations, banners, and cards.",
    tag: "Services",
  },
];

function rows(businesses: ShotBusiness[]) {
  return businesses.length ? businesses.slice(0, 4) : SAMPLE;
}

function ListingRow({ item }: { item: ShotBusiness }) {
  return (
    <div className="mosg-shot-card">
      {item.tag ? <p className="mosg-shot-kicker">{item.tag}</p> : null}
      <p className="mosg-shot-brand">{item.brandName}</p>
      <p className="mosg-shot-reg">{item.registeredName}</p>
      {item.summary ? <p className="mosg-shot-sum">{item.summary}</p> : null}
    </div>
  );
}

export function PhoneBrowseShot({
  businesses,
  searchPlaceholder,
  chips,
}: {
  businesses: ShotBusiness[];
  searchPlaceholder: string;
  chips: string[];
}) {
  const items = rows(businesses);
  const loop = [...items, ...items];
  return (
    <div className="mosg-phone mosg-float" aria-hidden="true">
      <div className="mosg-phone-bezel">
        <div className="mosg-phone-notch" />
        <div className="mosg-phone-screen">
          <p className="mosg-phone-wordmark">muslimowned.sg</p>
          <div className="mosg-phone-search">{searchPlaceholder}</div>
          <div className="mosg-phone-chips">
            {(chips.length ? chips : ["Catering", "Venues", "Services"]).slice(0, 4).map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
          <div className="mosg-phone-window">
            <div className="mosg-phone-track">
              {loop.map((item, index) => (
                <ListingRow key={`${item.brandName}-${index}`} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeskFrame({
  address,
  tilt,
  children,
}: {
  address: string;
  tilt?: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div className={`mosg-desk mosg-float ${tilt === "right" ? "tilt-r" : "tilt-l"}`} aria-hidden="true">
      <div className="mosg-desk-chrome">
        <i />
        <i />
        <i />
        <span>{address}</span>
      </div>
      <div className="mosg-desk-body">{children}</div>
    </div>
  );
}

export function DeskBrowseShot({
  businesses,
  searchPlaceholder,
  chips,
}: {
  businesses: ShotBusiness[];
  searchPlaceholder: string;
  chips: string[];
}) {
  const items = rows(businesses);
  return (
    <DeskFrame address="muslimowned.sg/browse" tilt="right">
      <div className="mosg-desk-search">{searchPlaceholder}</div>
      <div className="mosg-phone-chips mosg-desk-chips">
        {(chips.length ? chips : ["Catering", "Venues", "Services"]).slice(0, 4).map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>
      <div className="mosg-desk-grid">
        {items.slice(0, 3).map((item) => (
          <ListingRow key={item.brandName} item={item} />
        ))}
      </div>
    </DeskFrame>
  );
}

export function DeskFormShot({
  title,
  uen,
  registered,
  brand,
  contact,
  submit,
}: {
  title: string;
  uen: string;
  registered: string;
  brand: string;
  contact: string;
  submit: string;
}) {
  return (
    <DeskFrame address="muslimowned.sg/app/businesses/new" tilt="left">
      <p className="mosg-desk-title">{title}</p>
      <div className="mosg-form-grid">
        <label>
          {uen}
          <b>201234567A</b>
        </label>
        <label>
          {registered}
          <b>Saffron Kitchen Pte Ltd</b>
        </label>
        <label className="wide">
          {brand}
          <b>Saffron Kitchen</b>
        </label>
        <label className="wide">
          {contact}
          <b>hello@saffron.sg</b>
        </label>
      </div>
      <span className="mosg-form-btn">{submit}</span>
    </DeskFrame>
  );
}

export function DeskSearchShot({
  title,
  placeholder,
  submit,
  groups,
}: {
  title: string;
  placeholder: string;
  submit: string;
  groups: { title: string; names: string[] }[];
}) {
  return (
    <DeskFrame address="muslimowned.sg" tilt="right">
      <p className="mosg-desk-title">{title}</p>
      <div className="mosg-desk-intent">{placeholder}</div>
      <span className="mosg-form-btn">{submit}</span>
      <div className="mosg-desk-groups">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mosg-shot-kicker">{group.title}</p>
            <ul>
              {group.names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DeskFrame>
  );
}
