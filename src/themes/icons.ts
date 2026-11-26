import { ThemeId } from './types';

/**
 * Compact 24x24 multicolor pictogram SVG icons for all 18 themes so each
 * scene reads clearly at a glance on both mobile dock chips and desktop buttons.
 */
const THEME_ICONS: Record<ThemeId, string> = {
  tennis: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#c9e236" stroke="#8aa318" stroke-width="1.2"/>
    <path d="M7.5 4.2c3.2 3.4 3.2 12.2 0 15.6M16.5 4.2c-3.2 3.4-3.2 12.2 0 15.6" fill="none" stroke="#f7fae8" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
  diamonds: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="7,4 17,4 21.5,9.5 12,20.5 2.5,9.5" fill="#bfe8ff" stroke="#5aa9e6" stroke-width="1.2" stroke-linejoin="round"/>
    <polygon points="7,4 12,9.5 17,4" fill="#e8f7ff"/>
    <polygon points="12,9.5 21.5,9.5 12,20.5" fill="#7fc8f8" opacity="0.85"/>
    <path d="M2.5,9.5H21.5M7,4l5,16.5L17,4" fill="none" stroke="#ffffff" stroke-width="0.9" opacity="0.75"/>
  </svg>`,
  basketball: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#e25a24" stroke="#8a2e0b" stroke-width="1.2"/>
    <path d="M2.8 12h18.4M12 2.8v18.4M5.4 5.4c3.4 3.2 3.4 10 0 13.2M18.6 5.4c-3.4 3.2-3.4 10 0 13.2" fill="none" stroke="#24150f" stroke-width="1.35" stroke-linecap="round"/>
  </svg>`,
  gold: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="5,8.5 16.5,5.5 20.5,8.5 9,11.5" fill="#ffe787" stroke="#996b12" stroke-width="1"/>
    <polygon points="3.5,14.5 5,8.5 9,11.5 7.8,17.5" fill="#d99f26" stroke="#855a0b" stroke-width="1"/>
    <polygon points="9,11.5 20.5,8.5 19.2,14.5 7.8,17.5" fill="#f2bd39" stroke="#855a0b" stroke-width="1"/>
  </svg>`,
  soccer: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#f3f5f3" stroke="#7d8c7f" stroke-width="1.2"/>
    <polygon points="12,7.8 15.6,10.5 14.2,14.8 9.8,14.8 8.4,10.5" fill="#202523"/>
    <path d="M12,7.8V3.2M15.6,10.5l4,-1.8M14.2,14.8l3.1,3.6M9.8,14.8l-3.1,3.6M8.4,10.5l-4,-1.8" fill="none" stroke="#202523" stroke-width="1.25" stroke-linecap="round"/>
  </svg>`,
  bulbs: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a6.2 6.2 0 0 0-4.4 10.6c.9.9 1.6 2 1.8 3.2h5.2c.2-1.2.9-2.3 1.8-3.2A6.2 6.2 0 0 0 12 3z" fill="#ffd991" fill-opacity="0.72" stroke="#f5b84c" stroke-width="1.2"/>
    <path d="M10.2 14V9.8l1.8 1.7 1.8-1.7V14" fill="none" stroke="#fff3cf" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="9.3" y="16.8" width="5.4" height="3.2" rx="1" fill="#d49c3d" stroke="#7a5112" stroke-width="1"/>
    <path d="M10.4 20.6h3.2" stroke="#7a5112" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,
  balloons: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.8c3.6 0 6 2.8 6 6.4 0 3.7-2.8 6.4-6 7.5-3.2-1.1-6-3.8-6-7.5 0-3.6 2.4-6.4 6-6.4z" fill="#ff5a8a" stroke="#c92a5d" stroke-width="1.1"/>
    <ellipse cx="9.8" cy="6.8" rx="1.2" ry="2.2" transform="rotate(-20 9.8 6.8)" fill="#ffc9da" opacity="0.8"/>
    <polygon points="10.8,16.8 13.2,16.8 12,15.5" fill="#d93268"/>
    <path d="M12 17c-.9 1.6 1 2.4 0 4.5" fill="none" stroke="#f0d9a0" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,
  dice: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3.5" fill="#c2182b" stroke="#750916" stroke-width="1.2"/>
    <circle cx="8.5" cy="8.5" r="1.45" fill="#faf4e8"/>
    <circle cx="15.5" cy="8.5" r="1.45" fill="#faf4e8"/>
    <circle cx="12" cy="12" r="1.45" fill="#faf4e8"/>
    <circle cx="8.5" cy="15.5" r="1.45" fill="#faf4e8"/>
    <circle cx="15.5" cy="15.5" r="1.45" fill="#faf4e8"/>
  </svg>`,
  marbles: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#a8d8fc" stroke="#2c7ec4" stroke-width="1.2"/>
    <path d="M5.5 14c3.5-4.5 9.5-5 13 0M6.2 9.5c4 3.8 8 4 11.6 0" fill="none" stroke="#0d5be0" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
    <circle cx="8.5" cy="8" r="1.6" fill="#ffffff" opacity="0.85"/>
  </svg>`,
  ice: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12,3.5 19.5,7.8 19.5,16.2 12,20.5 4.5,16.2 4.5,7.8" fill="#bce8ff" fill-opacity="0.85" stroke="#62b2e0" stroke-width="1.2" stroke-linejoin="round"/>
    <polyline points="4.5,7.8 12,12 19.5,7.8" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="12" y1="12" x2="12" y2="20.5" stroke="#ffffff" stroke-width="1.1"/>
  </svg>`,
  jelly: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="13" rx="9" ry="7.6" fill="#ff528f" stroke="#d42667" stroke-width="1.1"/>
    <ellipse cx="9" cy="10" rx="2.6" ry="1.4" transform="rotate(-22 9 10)" fill="#ffffff" opacity="0.72"/>
  </svg>`,
  bearings: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#9eaab8" stroke="#47505c" stroke-width="1.2"/>
    <path d="M4.8 14.5a7.8 7.8 0 0 0 13.8 1.5A8.2 8.2 0 0 1 6.2 12.2c0-1 .2-2 .5-2.8a7.8 7.8 0 0 0-1.9 5.1z" fill="#5e6977" opacity="0.82"/>
    <circle cx="9.6" cy="8.8" r="4.2" fill="#e6edf5" opacity="0.72"/>
    <circle cx="8.6" cy="7.6" r="1.7" fill="#ffffff" opacity="0.95"/>
  </svg>`,
  porcelain: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#f5f2ea" stroke="#224c9e" stroke-width="1.2"/>
    <path d="M5.5 10.5c2 1.6 4.5 1.6 6.5 0s4.5-1.6 6.5 0M6.2 15c1.8-1.3 4-1.3 5.8 0s4 1.3 5.8 0" fill="none" stroke="#2354b2" stroke-width="1.45" stroke-linecap="round"/>
    <circle cx="12" cy="7.2" r="1.4" fill="#1e4ba3"/>
  </svg>`,
  bouncy: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="10.2" r="7.5" fill="#ff477e" stroke="#ff9f1c" stroke-width="1.2"/>
    <path d="M7 9.2c3-2.4 7-2.4 10 0" fill="none" stroke="#ffe066" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M7.5 20.5h9" stroke="#7ce0ff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 18.8v2.2M9 18.2l-1.5 1.5M15 18.2l1.5 1.5" stroke="#7ce0ff" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  paper: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12,3 18.5,6.2 20.5,13 16.2,19.8 8.2,20.2 3.8,14 5.5,6.5" fill="#f2ede2" stroke="#998f7c" stroke-width="1.2" stroke-linejoin="round"/>
    <polyline points="12,3 11,11.5 20.5,13" fill="none" stroke="#b8ae9b" stroke-width="1.1"/>
    <polyline points="5.5,6.5 11,11.5 8.2,20.2" fill="none" stroke="#9eaec9" stroke-width="1"/>
  </svg>`,
  wood: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#a86a3a" stroke="#5c3618" stroke-width="1.2"/>
    <path d="M5.5 8.5c4.5 1.4 8.5 1.4 13 0M4.8 12.2c4.8 1.8 9.6 1.8 14.4 0M6.2 16c3.8 1.2 7.8 1.2 11.6 0" fill="none" stroke="#633a1b" stroke-width="1.35" stroke-linecap="round"/>
  </svg>`,
  stone: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#7c828a" stroke="#3f434a" stroke-width="1.2"/>
    <circle cx="8.8" cy="9.2" r="1.1" fill="#464b52"/>
    <circle cx="14.8" cy="10.4" r="1.4" fill="#a8aeb5"/>
    <circle cx="10.5" cy="15.2" r="1.2" fill="#52575e"/>
    <circle cx="15.4" cy="15.5" r="0.9" fill="#d0d5db"/>
  </svg>`,
  trio: `<svg viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12,3 16,5.5 15,10 9.5,10 8,5.8" fill="#f3eee2" stroke="#8f8675" stroke-width="1.1" stroke-linejoin="round"/>
    <circle cx="7.4" cy="15.6" r="4.6" fill="#a86a3a" stroke="#5c3618" stroke-width="1.1"/>
    <circle cx="16.6" cy="15.6" r="4.6" fill="#7d838c" stroke="#3e4249" stroke-width="1.1"/>
  </svg>`,
};

export function getThemeIconSvg(id: ThemeId): string {
  return THEME_ICONS[id];
}
