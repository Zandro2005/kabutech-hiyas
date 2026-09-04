/**
 * Avatar Color Utility
 * Generates deterministic, vibrant color themes per user so every profile
 * avatar has a distinct, beautiful color across the app.
 */

export interface AvatarTheme {
  primary: string;
  bgLight: string;
  bgDark: string;
  border: string;
  textLight: string;
  textDark: string;
}

const PALETTE: AvatarTheme[] = [
  {
    primary: '#2563eb', // Blue
    bgLight: 'rgba(37, 99, 235, 0.12)',
    bgDark: 'rgba(59, 130, 246, 0.25)',
    border: 'rgba(37, 99, 235, 0.25)',
    textLight: '#1d4ed8',
    textDark: '#60a5fa',
  },
  {
    primary: '#7c3aed', // Violet
    bgLight: 'rgba(124, 58, 237, 0.12)',
    bgDark: 'rgba(139, 92, 246, 0.25)',
    border: 'rgba(124, 58, 237, 0.25)',
    textLight: '#6d28d9',
    textDark: '#a78bfa',
  },
  {
    primary: '#059669', // Emerald
    bgLight: 'rgba(5, 150, 105, 0.12)',
    bgDark: 'rgba(16, 185, 129, 0.25)',
    border: 'rgba(5, 150, 105, 0.25)',
    textLight: '#047857',
    textDark: '#34d399',
  },
  {
    primary: '#ea580c', // Orange
    bgLight: 'rgba(234, 88, 12, 0.12)',
    bgDark: 'rgba(249, 115, 22, 0.25)',
    border: 'rgba(234, 88, 12, 0.25)',
    textLight: '#c2410c',
    textDark: '#fb923c',
  },
  {
    primary: '#0d9488', // Teal
    bgLight: 'rgba(13, 148, 136, 0.12)',
    bgDark: 'rgba(20, 184, 166, 0.25)',
    border: 'rgba(13, 148, 136, 0.25)',
    textLight: '#0f766e',
    textDark: '#2dd4bf',
  },
  {
    primary: '#db2777', // Pink
    bgLight: 'rgba(219, 39, 119, 0.12)',
    bgDark: 'rgba(236, 72, 153, 0.25)',
    border: 'rgba(219, 39, 119, 0.25)',
    textLight: '#be185d',
    textDark: '#f472b6',
  },
  {
    primary: '#d97706', // Amber
    bgLight: 'rgba(217, 119, 6, 0.12)',
    bgDark: 'rgba(245, 158, 11, 0.25)',
    border: 'rgba(217, 119, 6, 0.25)',
    textLight: '#b45309',
    textDark: '#fbbf24',
  },
  {
    primary: '#0891b2', // Cyan
    bgLight: 'rgba(8, 145, 178, 0.12)',
    bgDark: 'rgba(6, 182, 212, 0.25)',
    border: 'rgba(8, 145, 178, 0.25)',
    textLight: '#0e7490',
    textDark: '#22d3ee',
  },
  {
    primary: '#4f46e5', // Indigo
    bgLight: 'rgba(79, 70, 229, 0.12)',
    bgDark: 'rgba(99, 102, 241, 0.25)',
    border: 'rgba(79, 70, 229, 0.25)',
    textLight: '#4338ca',
    textDark: '#818cf8',
  },
  {
    primary: '#e11d48', // Rose
    bgLight: 'rgba(225, 29, 72, 0.12)',
    bgDark: 'rgba(244, 63, 94, 0.25)',
    border: 'rgba(225, 29, 72, 0.25)',
    textLight: '#be123c',
    textDark: '#fb7185',
  },
  {
    primary: '#9333ea', // Purple
    bgLight: 'rgba(147, 51, 234, 0.12)',
    bgDark: 'rgba(168, 85, 247, 0.25)',
    border: 'rgba(147, 51, 234, 0.25)',
    textLight: '#7e22ce',
    textDark: '#c084fc',
  },
  {
    primary: '#0284c7', // Sky
    bgLight: 'rgba(2, 132, 199, 0.12)',
    bgDark: 'rgba(14, 165, 233, 0.25)',
    border: 'rgba(2, 132, 199, 0.25)',
    textLight: '#0369a1',
    textDark: '#38bdf8',
  },
];

/**
 * Returns a consistent AvatarTheme object for any user identifier (name, uid, or email).
 */
export function getAvatarTheme(seed?: string | null): AvatarTheme {
  if (!seed || typeof seed !== 'string') {
    return PALETTE[0];
  }
  const cleanSeed = seed.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = cleanSeed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

/**
 * Returns just the primary hex color for a given user identifier.
 */
export function getAvatarColor(seed?: string | null): string {
  return getAvatarTheme(seed).primary;
}
