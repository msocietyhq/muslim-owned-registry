export function StarTile({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40 4l6.2 18.8L65 29l-18.8 6.2L40 54l-6.2-18.8L15 29l18.8-6.2L40 4z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="40" cy="29" r="4" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function ArchFrame({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 170V78c0-48 40-70 140-70s140 22 140 70v92"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M48 170V90c0-34 28-50 112-50s112 16 112 50v80"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
    </svg>
  );
}
