/** The Knowmark mark, matching the app icon: three lines and a check on the accent colour. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <g fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5 8h5M5.5 12h4M5.5 16h5.5" />
        <path d="M12.5 12.5l2.5 2.5 4-6" />
      </g>
    </svg>
  );
}
