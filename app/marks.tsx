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
