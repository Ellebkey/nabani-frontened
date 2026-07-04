import { MAGUEY_USER_COLORS, MAGUEY_USER_PALETTE, toMutedColor } from './maguey-palette';

describe('maguey-palette', () => {
  it('should expose the 16 muted colors of sistema.html §1', () => {
    expect(MAGUEY_USER_PALETTE).toHaveLength(16);
    expect(MAGUEY_USER_COLORS).toContain('#3B5F82');
    expect(MAGUEY_USER_COLORS).toContain('#2E3A46');
  });

  it('should keep palette colors untouched (idempotent)', () => {
    for (const color of MAGUEY_USER_COLORS) {
      expect(toMutedColor(color)).toBe(color);
      expect(toMutedColor(color.toLowerCase())).toBe(color);
    }
  });

  it('should map known raw bank colors to their muted neighbor by hue', () => {
    expect(toMutedColor('#3570B4')).toBe('#3B5F82'); // azul Bancomer → Marino
    expect(toMutedColor('#ed0722')).toBe('#A64F4F'); // rojo Scotiabank → Teja
    expect(toMutedColor('#10b981')).toBe('#3E7C74'); // esmeralda → Jade
    expect(toMutedColor('#ffcc00')).toBe('#C9A45C'); // amarillo → Ocre
  });

  it('should send near-grays to Grafito or Acero by lightness', () => {
    expect(toMutedColor('#222222')).toBe('#2E3A46'); // Grafito
    expect(toMutedColor('#97a3a8')).toBe('#5F7386'); // Acero
  });

  it('should fall back to Acero for missing or invalid values', () => {
    expect(toMutedColor(null)).toBe('#5F7386');
    expect(toMutedColor(undefined)).toBe('#5F7386');
    expect(toMutedColor('')).toBe('#5F7386');
    expect(toMutedColor('not-a-color')).toBe('#5F7386');
    expect(toMutedColor('rgb(10, 20, 30)')).toBe('#5F7386');
  });
});
