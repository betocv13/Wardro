// src/lib/colors.ts

export type RGB = [number, number, number];

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l }; // s,l in [0..1]
}

export function isGrayish([r, g, b]: RGB): boolean {
  const { s, l } = rgbToHsl(r, g, b);
  // low saturation OR extreme light/dark → treat as neutral
  return s < 0.15 || l < 0.12 || l > 0.92;
}

function dist(a: RGB, b: RGB): number {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Remove colors that are "near" another one (keeps the first occurrence).
 * @param colors list of RGB triplets
 * @param threshold 0–441 (~sqrt(255^2*3)), typical 24–36
 */
export function dedupeNear(colors: RGB[], threshold = 30): RGB[] {
  const out: RGB[] = [];
  for (const c of colors) {
    if (!out.some(o => dist(o, c) < threshold)) out.push(c);
  }
  return out;
}