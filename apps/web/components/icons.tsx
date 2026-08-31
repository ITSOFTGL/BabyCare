'use client';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export type IconName =
  | 'home'
  | 'child'
  | 'room'
  | 'level'
  | 'teacher'
  | 'payment'
  | 'account'
  | 'announce'
  | 'report'
  | 'bell'
  | 'search'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'x'
  | 'menu'
  | 'logout'
  | 'calendar'
  | 'invoice'
  | 'alert'
  | 'sun'
  | 'moon'
  | 'food'
  | 'bottle'
  | 'diaper'
  | 'note'
  | 'sleep'
  | 'users'
  | 'heart'
  | 'spark'
  | 'download'
  | 'clock'
  | 'filter'
  | 'chevron';

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
    />
  ),
  child: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
    />
  ),
  room: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 20V8l8-5 8 5v12H4Zm5-4h6v4H9v-4Z"
    />
  ),
  level: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2Z"
    />
  ),
  teacher: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 21v-1c0-3.3 3.6-6 8-6s8 2.7 8 6v1"
      />
    </>
  ),
  payment: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm0 3h18M7 16h2"
    />
  ),
  account: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 20a7 7 0 0 1 14 0M19 8v4m2-2h-4"
    />
  ),
  announce: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 10v4a2 2 0 0 0 2 2h2l5 4V4L8 8H6a2 2 0 0 0-2 2Zm13.5-1.5a5 5 0 0 1 0 7M16 10.2a2.5 2.5 0 0 1 0 3.6"
    />
  ),
  report: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19V5a1 1 0 0 1 1-1h10l5 5v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm11-15v5h5M8 13h8M8 17h5"
    />
  ),
  bell: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 17h12l-1.2-2.1A7 7 0 0 1 16 10V9a4 4 0 0 0-8 0v1a7 7 0 0 1-1.8 4.9Zm3.2 3a3 3 0 0 0 5.6 0"
    />
  ),
  search: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m20 20-4.2-4.2M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0Z"
    />
  ),
  plus: <path strokeLinecap="round" d="M12 5v14M5 12h14" />,
  edit: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 20h4l11-11-4-4L4 16v4Zm12-16 4 4"
    />
  ),
  trash: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 7h14M9 7V5h6v2m-8 0 1 13h8l1-13"
    />
  ),
  check: <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-10" />,
  x: <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />,
  menu: <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />,
  logout: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M10 5h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8"
    />
  ),
  calendar: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
    />
  ),
  invoice: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 3h8l4 4v14H7V3Zm8 0v4h4M9 12h6M9 16h4"
    />
  ),
  alert: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
    />
  ),
  sun: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.1-6.1 1.4-1.4M4.5 19.5l1.4-1.4M19.5 19.5l-1.4-1.4M5.9 5.9 4.5 4.5M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
    />
  ),
  moon: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 14.5A7.5 7.5 0 1 1 9.5 6 6 6 0 0 0 18 14.5Z"
    />
  ),
  food: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 11h16v1a8 8 0 0 1-16 0Zm3-7v5M12 4v5M17 4v5"
    />
  ),
  bottle: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 2h6v3H9Zm1 3v2.2L8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10l-2-2.8V5"
    />
  ),
  diaper: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 8h16v4c0 5-4 8-8 8s-8-3-8-8Zm0 4h4a4 4 0 0 0 8 0h4"
    />
  ),
  note: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Zm2 5h4M10 13h4"
    />
  ),
  sleep: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 9h5l-5 6h5M5 7h4l-4 6h4"
    />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11Zm8.5-1a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 20v-.8C2 16.5 5 15 9 15s7 1.5 7 4.2V20m2-5c2.8 0 5 1.1 5 3.2V20"
    />
  ),
  heart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z"
    />
  ),
  spark: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v4M12 17v4M4.2 6.2l2.8 2.8M17 15l2.8 2.8M3 12h4M17 12h4M4.2 17.8 7 15M17 9l2.8-2.8"
    />
  ),
  download: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"
    />
  ),
  clock: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  ),
  filter: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M7 12h10M10 18h4"
    />
  ),
  chevron: (
    <path strokeLinecap="round" strokeLinejoin="round" d="m8 10 4 4 4-4" />
  ),
};

export function Icon({
  name,
  className,
  size = 20,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={cx('shrink-0', className)}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

/** Marca de la casa: techo + sol, para el logotipo. */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={cx('shrink-0', className)}
      aria-hidden
    >
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path
        d="M10 20.5 20 12l10 8.5V29a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 10 29Z"
        fill="#FFFCF7"
      />
      <circle cx="27.5" cy="12.5" r="3" fill="#F0E6D0" />
      <rect x="17.2" y="22.5" width="5.6" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}
