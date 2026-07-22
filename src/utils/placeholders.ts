// 默认占位封面（SVG data URL）
export const PLACEHOLDER_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFC5AB"/>
          <stop offset="1" stop-color="#FF6B35"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="20" fill="url(#g)"/>
      <path d="M96 84v66a18 18 0 1 1-9-15.6V96l66-16v54a18 18 0 1 1-9-15.6V74a6 6 0 0 0-7.3-5.9l-36 8.7a6 6 0 0 0-4.7 5.9z" fill="#fff" opacity="0.95"/>
    </svg>`
  );
