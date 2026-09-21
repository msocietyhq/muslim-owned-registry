import { osmEmbedUrl, osmPageUrl, type LatLng } from "@/lib/geo";
import { ui } from "@/lib/ui";

export function OsmEmbed({
  point,
  title,
  openLabel,
}: {
  point: LatLng;
  title: string;
  openLabel: string;
}) {
  return (
    <div>
      <iframe
        title={title}
        src={osmEmbedUrl(point)}
        className="h-64 w-full rounded-2xl border border-rule bg-leaf"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className={`${ui.small} mt-2`}>
        <a className={ui.link} href={osmPageUrl(point)} rel="noreferrer" target="_blank">
          {openLabel}
        </a>
      </p>
    </div>
  );
}
