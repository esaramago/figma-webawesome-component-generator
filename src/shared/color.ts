import type { FigmaColor } from './types';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Parses a browser-computed CSS color string (`rgb(...)`, `rgba(...)`,
 * `color(srgb ...)`, `#rgb`, `#rrggbb`, `#rrggbbaa`, or `transparent`)
 * into a Figma-compatible RGBA color with 0..1 channel values.
 */
export function parseCssColorToFigma(cssColor: string): FigmaColor {
  const trimmed = cssColor.trim().toLowerCase();

  if (!trimmed || trimmed === 'transparent' || trimmed === 'none') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Hex formats: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a: clamp01(a) };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a: clamp01(a) };
    }
  }

  // rgb(r, g, b) / rgba(r, g, b, a) / rgb(r g b / a)
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
  );
  if (rgbMatch) {
    const parseChannel = (raw: string) =>
      raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw) / 255;
    const parseAlpha = (raw?: string) => {
      if (!raw) return 1;
      return raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
    };
    return {
      r: clamp01(parseChannel(rgbMatch[1])),
      g: clamp01(parseChannel(rgbMatch[2])),
      b: clamp01(parseChannel(rgbMatch[3])),
      a: clamp01(parseAlpha(rgbMatch[4])),
    };
  }

  // color(srgb r g b / a)
  const srgbMatch = trimmed.match(
    /^color\(\s*srgb\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/
  );
  if (srgbMatch) {
    const parseAlpha = (raw?: string) => {
      if (!raw) return 1;
      return raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
    };
    return {
      r: clamp01(parseFloat(srgbMatch[1])),
      g: clamp01(parseFloat(srgbMatch[2])),
      b: clamp01(parseFloat(srgbMatch[3])),
      a: clamp01(parseAlpha(srgbMatch[4])),
    };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

export function toSolidPaint(color: FigmaColor): SolidPaint {
  return {
    type: 'SOLID',
    color: { r: color.r, g: color.g, b: color.b },
    opacity: color.a,
  };
}
