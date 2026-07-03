function Icone({ className = '', children }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MapPin({ className }) {
  return (
    <Icone className={className}>
      <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icone>
  );
}

export function Clock({ className }) {
  return (
    <Icone className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icone>
  );
}

export function Users({ className }) {
  return (
    <Icone className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icone>
  );
}

export function Shield({ className }) {
  return (
    <Icone className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icone>
  );
}

export function Search({ className }) {
  return (
    <Icone className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icone>
  );
}

export function Car({ className }) {
  return (
    <Icone className={className}>
      <path d="M19 17h2l-2-6a3 3 0 0 0-3-2H8a3 3 0 0 0-3 2l-2 6h2" />
      <path d="M5 17h14" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </Icone>
  );
}

export function ArrowRight({ className }) {
  return (
    <Icone className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icone>
  );
}

export function GraduationCap({ className }) {
  return (
    <Icone className={className}>
      <path d="m22 10-10-5-10 5 10 5 10-5z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </Icone>
  );
}
