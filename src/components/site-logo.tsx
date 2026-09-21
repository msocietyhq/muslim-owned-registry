export function SiteLogo({
  className = "h-11 w-11",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const ground = onDark ? "#f4efe4" : "#0c3f32";
  const arch = onDark ? "#0c3f32" : "#f4efe4";
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="64" r="64" fill={ground} />
      <path
        fill={arch}
        d="M40 102V58c0-16 10-28 24-32 14 4 24 16 24 32v44H78V60c0-10-6-18-14-20.5C56 42 50 50 50 60v42H40Z"
      />
      <rect x="56" y="74" width="16" height="28" rx="3" fill="#c4a35a" />
    </svg>
  );
}
