export default function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="logo-wing" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2E6E9E" />
          <stop offset="0.45" stopColor="#F2B417" />
          <stop offset="0.75" stopColor="#E8720C" />
          <stop offset="1" stopColor="#C0341D" />
        </linearGradient>
      </defs>
      {/* silueta porumbelului in zbor, aripa cu degrade — dupa logo-ul brandului */}
      <path
        d="M18 62 Q30 48 45 50 Q40 38 52 30 Q50 44 58 48 Q74 52 82 44 Q80 58 66 63 Q52 68 40 66 Q28 66 18 62 Z"
        fill="#1B1B1B"
      />
      <path
        d="M45 50 Q52 20 84 12 Q76 34 60 44 Q52 48 45 50 Z"
        fill="url(#logo-wing)"
      />
      <circle cx="76" cy="46" r="1.8" fill="#F3EEE1" />
    </svg>
  );
}
