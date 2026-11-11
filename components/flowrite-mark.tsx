/**
 * Flowrite's mark: an F built from the review's diff styles. The stem is
 * solid, the top arm is struck through like removed text, and the middle arm
 * is emerald like inserted text. It draws in `currentColor`, so it takes the
 * colour of the text around it. Same geometry as `app/icon.svg`.
 *
 * Like a lucide icon it has an intrinsic 24px size, so it never collapses to
 * nothing when no size class applies; a class such as `h-5 w-5` overrides it.
 */
export function FlowriteMark({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <rect x="4.5" y="3" width="3.75" height="18" rx="1.6" fill="currentColor" />
      <rect
        x="9.75"
        y="3"
        width="10"
        height="4.75"
        rx="1.6"
        fill="currentColor"
        className="opacity-15 dark:opacity-30"
      />
      <path
        d="M11 5.375h7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="9.75"
        y="10"
        width="7"
        height="4.75"
        rx="1.6"
        className="fill-emerald-600 dark:fill-emerald-400"
      />
    </svg>
  );
}
