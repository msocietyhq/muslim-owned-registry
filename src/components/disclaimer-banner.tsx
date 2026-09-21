import { DISCLAIMER_SENTENCE } from "@/lib/legal";

export function DisclaimerBanner() {
  return (
    <img
      className="disclaimer-banner"
      src="/disclaimer.png"
      srcSet="/disclaimer-banner-sm.png 640w, /disclaimer.png 1024w"
      sizes="100vw"
      width={2048}
      height={440}
      alt={DISCLAIMER_SENTENCE}
    />
  );
}
