export function Plane({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M21.6 3.3 2.8 10.6c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.8c.2.6.1.8.7.8.5 0 .7-.2.9-.4l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.9l3.1-15.1c.3-1.4-.5-2-1.2-1.8Z" />
    </svg>
  );
}
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="Samuriq AI home">
      <svg
        className="identity-mark"
        aria-hidden="true"
        width="42"
        height="42"
        viewBox="0 0 48 48"
        fill="none"
      >
        <path
          d="M39 8H17L7 18l22 12-10 10H7"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="miter"
        />
        <path
          d="M9 40h22l10-10L19 18 29 8h12"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span>
        samuriq<span className="brand-ai"> ai</span>
        <small>HUMAN DATA. REAL POSSIBILITY.</small>
      </span>
    </a>
  );
}
