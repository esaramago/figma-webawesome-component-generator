import { toSolidPaint } from '../../shared/color';
import type { FigmaColor } from '../../shared/types';

export interface LoadedFontSet {
  regular: FontName;
  medium: FontName;
  semibold: FontName;
}

const DEFAULT_FONT_FAMILY = 'Montserrat';

let cachedAvailableFonts: Map<string, string[]> | null = null;
const cachedFontSets = new Map<string, LoadedFontSet>();

function normalizeStyleName(style: string): string {
  return style.toLowerCase().replace(/[\s_-]+/g, '');
}

async function getAvailableFontMap(): Promise<Map<string, string[]>> {
  if (cachedAvailableFonts) return cachedAvailableFonts;

  const fonts = await figma.listAvailableFontsAsync();
  const map = new Map<string, string[]>();

  for (const font of fonts) {
    const { family, style } = font.fontName;
    let styles = map.get(family);
    if (!styles) {
      styles = [];
      map.set(family, styles);
    }
    if (!styles.includes(style)) {
      styles.push(style);
    }
  }

  cachedAvailableFonts = map;
  return map;
}

export async function getAvailableFontFamilies(): Promise<{
  families: string[];
  defaultFamily: string;
}> {
  const map = await getAvailableFontMap();
  const families = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  const defaultFamily = families.includes(DEFAULT_FONT_FAMILY)
    ? DEFAULT_FONT_FAMILY
    : (families[0] ?? DEFAULT_FONT_FAMILY);

  return { families, defaultFamily };
}

function pickFontStyle(
  availableStyles: string[],
  candidates: string[],
  fallback?: string
): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeStyleName(candidate);
    const match = availableStyles.find(
      (style) => normalizeStyleName(style) === normalized
    );
    if (match) return match;
  }
  return fallback;
}

export async function loadPluginFonts(
  family = DEFAULT_FONT_FAMILY
): Promise<LoadedFontSet> {
  const targetFamily = family.trim() || DEFAULT_FONT_FAMILY;
  const cached = cachedFontSets.get(targetFamily);
  if (cached) return cached;

  const fontMap = await getAvailableFontMap();
  const availableStyles = fontMap.get(targetFamily) ?? [];

  const nonItalicFallback =
    availableStyles.find((s) => !/italic|oblique/i.test(s)) ??
    availableStyles[0] ??
    'Regular';

  const regularStyle =
    pickFontStyle(
      availableStyles,
      ['Regular', 'Normal', 'Book', 'Roman', '400'],
      nonItalicFallback
    ) ?? 'Regular';

  const regular: FontName = { family: targetFamily, style: regularStyle };
  await figma.loadFontAsync(regular);

  const mediumStyle = pickFontStyle(availableStyles, ['Medium', '500']);
  let medium: FontName = mediumStyle
    ? { family: targetFamily, style: mediumStyle }
    : regular;
  if (medium !== regular) {
    try {
      await figma.loadFontAsync(medium);
    } catch {
      medium = regular;
    }
  }

  const semiboldStyle = pickFontStyle(availableStyles, [
    'Semi Bold',
    'SemiBold',
    'Demi Bold',
    'DemiBold',
    '600',
    'Bold',
    '700',
  ]);
  let semibold: FontName = semiboldStyle
    ? { family: targetFamily, style: semiboldStyle }
    : medium;
  if (semibold !== medium) {
    try {
      await figma.loadFontAsync(semibold);
    } catch {
      semibold = medium;
    }
  }

  const loaded: LoadedFontSet = { regular, medium, semibold };
  cachedFontSets.set(targetFamily, loaded);
  return loaded;
}

export function fontForWeight(fonts: LoadedFontSet, weight: number): FontName {
  if (weight >= 600) return fonts.semibold;
  if (weight >= 500) return fonts.medium;
  return fonts.regular;
}

export function setSolidFill(
  node: MinimalFillsMixin,
  color: FigmaColor | null
): void {
  if (!color || color.a <= 0) {
    node.fills = [];
    return;
  }
  node.fills = [toSolidPaint(color)];
}

export function setSolidStroke(
  node: MinimalStrokesMixin & { strokeAlign?: 'CENTER' | 'INSIDE' | 'OUTSIDE' },
  color: FigmaColor | null,
  weight: number
): void {
  if (!color || color.a <= 0 || weight <= 0) {
    node.strokes = [];
    return;
  }
  node.strokes = [toSolidPaint(color)];
  node.strokeWeight = weight;
  if ('strokeAlign' in node) {
    node.strokeAlign = 'INSIDE';
  }
}

export interface CreateTextOptions {
  name: string;
  characters: string;
  fontName: FontName;
  fontSize: number;
  lineHeightRatio: number;
  color: FigmaColor;
}

export function createTextNode(options: CreateTextOptions): TextNode {
  const text = figma.createText();
  text.name = options.name;
  text.fontName = options.fontName;
  text.fontSize = options.fontSize;
  text.lineHeight = {
    unit: 'PERCENT',
    value: Math.round(options.lineHeightRatio * 100),
  };
  text.characters = options.characters;
  setSolidFill(text, options.color);
  return text;
}

export function applyFocusRing(
  node: BlendMixin,
  focusColor: FigmaColor,
  ringWidth: number,
  ringOffset: number
): void {
  // Two crisp spread shadows: 1px white offset + outer focus ring
  const effects: DropShadowEffect[] = [];

  if (ringOffset > 0) {
    effects.push({
      type: 'DROP_SHADOW',
      color: { r: 1, g: 1, b: 1, a: 1 },
      offset: { x: 0, y: 0 },
      radius: 0,
      spread: ringOffset,
      visible: true,
      blendMode: 'NORMAL',
    });
  }

  effects.push({
    type: 'DROP_SHADOW',
    color: {
      r: focusColor.r,
      g: focusColor.g,
      b: focusColor.b,
      a: focusColor.a,
    },
    offset: { x: 0, y: 0 },
    radius: 0,
    spread: ringOffset + ringWidth,
    visible: true,
    blendMode: 'NORMAL',
  });

  node.effects = effects;
}
