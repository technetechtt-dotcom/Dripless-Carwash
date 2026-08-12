import type { OpsNavIconId } from '../pages/dashboard/navigation';

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
};

export const OpsIcon = ({ name }: { name: OpsNavIconId }) => {
  switch (name) {
    case 'gauge':
      return (
        <svg {...iconProps}>
          <path d="M12 14l3-3" />
          <path d="M4.9 19.1A9 9 0 1 1 19.1 4.9" />
          <path d="M4.9 4.9A9 9 0 0 0 4 12" />
        </svg>
      );
    case 'dispatch':
      return (
        <svg {...iconProps}>
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="6" r="2" />
          <path d="M8 17l8-8" />
          <path d="M14 6h4v4" />
        </svg>
      );
    case 'jobs':
      return (
        <svg {...iconProps}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M9 3v4M15 3v4M4 10h16" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...iconProps}>
          <path d="M12 3l10 18H2L12 3z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      );
    case 'drivers':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
        </svg>
      );
    case 'customers':
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
          <path d="M15 19c.4-1.8 1.8-3 3.5-3 1 0 1.9.4 2.5 1" />
        </svg>
      );
    case 'inbox':
      return (
        <svg {...iconProps}>
          <path d="M4 6h16v12H4z" />
          <path d="M4 13h4l2 3h4l2-3h4" />
        </svg>
      );
    case 'broadcast':
      return (
        <svg {...iconProps}>
          <path d="M4 10v4h3l5 4V6L7 10H4z" />
          <path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10" />
        </svg>
      );
    case 'promo':
      return (
        <svg {...iconProps}>
          <path d="M20 12l-8-8H6v6l8 8 6-6z" />
          <circle cx="8.5" cy="8.5" r="1.2" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...iconProps}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 16V10M12 16V7M16 16v-4" />
        </svg>
      );
    case 'audit':
      return (
        <svg {...iconProps}>
          <path d="M8 4h10v16H6V6" />
          <path d="M9 10h6M9 14h6M9 18h4" />
        </svg>
      );
    default:
      return null;
  }
};
