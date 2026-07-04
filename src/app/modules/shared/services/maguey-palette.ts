export interface MutedColor {
  name: string;
  hex: string;
}

// 16-color muted palette for account/method/tag colors (sistema.html §1)
export const MAGUEY_USER_PALETTE: MutedColor[] = [
  { name: 'Marino', hex: '#3B5F82' },
  { name: 'Teja', hex: '#A64F4F' },
  { name: 'Bosque', hex: '#4E8A6A' },
  { name: 'Ciruela', hex: '#6A5A8C' },
  { name: 'Ámbar', hex: '#C08A4E' },
  { name: 'Laguna', hex: '#58939C' },
  { name: 'Frambuesa', hex: '#A85D6E' },
  { name: 'Acero', hex: '#5F7386' },
  { name: 'Olivo', hex: '#8A8A4E' },
  { name: 'Arcilla', hex: '#B0806A' },
  { name: 'Ocre', hex: '#C9A45C' },
  { name: 'Salvia', hex: '#8FA98C' },
  { name: 'Malva', hex: '#7D6A85' },
  { name: 'Índigo', hex: '#56698F' },
  { name: 'Jade', hex: '#3E7C74' },
  { name: 'Grafito', hex: '#2E3A46' },
];

export const MAGUEY_USER_COLORS = MAGUEY_USER_PALETTE.map(color => color.hex);

const FALLBACK = '#5F7386'; // Acero

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return null;
  }
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    return { h: 0, s: 0, l };
  }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
}

const PALETTE_HSL = MAGUEY_USER_PALETTE.map(color => ({ hex: color.hex, hsl: hexToHsl(color.hex)! }));

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Maps any raw stored color to the closest muted one by hue
 * (Maguey 2.0 load-time migration, DB untouched). The 16 muted pass through intact.
 */
export function toMutedColor(color: string | null | undefined): string {
  if (!color) {
    return FALLBACK;
  }
  const normalized = color.trim().toUpperCase();
  if (MAGUEY_USER_PALETTE.some(muted => muted.hex === normalized)) {
    return normalized;
  }

  const hsl = hexToHsl(color);
  if (!hsl) {
    return FALLBACK;
  }
  if (hsl.s < 0.1) {
    return hsl.l < 0.55 ? '#2E3A46' : FALLBACK;
  }

  let best = FALLBACK;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of PALETTE_HSL) {
    // Hue rules; saturation and lightness break ties between close neighbors
    const score =
      hueDistance(hsl.h, candidate.hsl.h) +
      Math.abs(hsl.l - candidate.hsl.l) * 30 +
      Math.abs(hsl.s - candidate.hsl.s) * 15;
    if (score < bestScore) {
      bestScore = score;
      best = candidate.hex;
    }
  }
  return best;
}
