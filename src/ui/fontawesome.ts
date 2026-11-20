export type FontAwesomeStyle = 'auto' | 'solid' | 'regular' | 'brands';
export type ConcreteFontAwesomeStyle = 'solid' | 'regular' | 'brands';

const FA_CDN_BASE =
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs';

const STYLE_ORDER: ConcreteFontAwesomeStyle[] = ['solid', 'regular', 'brands'];

const svgCache = new Map<string, string>();
const missingCache = new Set<string>();

export interface ParsedIconQuery {
  name: string;
  styles: ConcreteFontAwesomeStyle[];
}

const STYLE_PREFIX_MAP: Record<string, ConcreteFontAwesomeStyle> = {
  solid: 'solid',
  'fa-solid': 'solid',
  fas: 'solid',
  regular: 'regular',
  'fa-regular': 'regular',
  far: 'regular',
  brands: 'brands',
  'fa-brands': 'brands',
  fab: 'brands',
};

/**
 * Normalizes user input like `arrow-right`, `fa-arrow-right`,
 * `fa-solid fa-arrow-right`, or `brands/github` into an icon name + style list.
 */
export function parseFontAwesomeInput(
  raw: string,
  fallbackStyle: FontAwesomeStyle
): ParsedIconQuery | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  let explicitStyle: ConcreteFontAwesomeStyle | null = null;
  let iconPart = trimmed;

  // Handle `solid/arrow-right` format
  if (iconPart.includes('/')) {
    const [maybeStyle, rest] = iconPart.split('/', 2);
    if (maybeStyle && STYLE_PREFIX_MAP[maybeStyle] && rest) {
      explicitStyle = STYLE_PREFIX_MAP[maybeStyle];
      iconPart = rest;
    }
  } else {
    // Handle `fa-solid fa-arrow-right` or `fas fa-arrow-right`
    const tokens = iconPart.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      const remaining: string[] = [];
      for (const token of tokens) {
        if (!explicitStyle && STYLE_PREFIX_MAP[token]) {
          explicitStyle = STYLE_PREFIX_MAP[token];
        } else {
          remaining.push(token);
        }
      }
      iconPart = remaining[0] ?? '';
    }
  }

  // Strip leading `fa-` if present
  const cleanName = iconPart
    .replace(/^fa-/, '')
    .replace(/[^a-z0-9-]/g, '');

  if (!cleanName) return null;

  const styles: ConcreteFontAwesomeStyle[] = explicitStyle
    ? [explicitStyle]
    : fallbackStyle === 'auto'
      ? STYLE_ORDER
      : [fallbackStyle];

  return { name: cleanName, styles };
}

export interface FetchedFontAwesomeIcon {
  name: string;
  style: ConcreteFontAwesomeStyle;
  svg: string;
}

/**
 * Fetches a FontAwesome Free SVG icon from jsDelivr CDN with in-memory caching.
 */
export async function fetchFontAwesomeSvg(
  rawInput: string,
  fallbackStyle: FontAwesomeStyle
): Promise<FetchedFontAwesomeIcon> {
  const parsed = parseFontAwesomeInput(rawInput, fallbackStyle);
  if (!parsed) {
    throw new Error('Enter a valid FontAwesome icon name (e.g. "arrow-right").');
  }

  for (const style of parsed.styles) {
    const cacheKey = `${style}/${parsed.name}`;
    const cached = svgCache.get(cacheKey);
    if (cached) {
      return { name: parsed.name, style, svg: cached };
    }
    if (missingCache.has(cacheKey)) {
      continue;
    }

    const url = `${FA_CDN_BASE}/${style}/${parsed.name}.svg`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error(
        'Network request failed while fetching FontAwesome icon from jsDelivr.'
      );
    }

    if (response.status === 404) {
      missingCache.add(cacheKey);
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to load "${parsed.name}" (${response.status} ${response.statusText}).`
      );
    }

    const svg = await response.text();
    if (!svg.includes('<svg')) {
      missingCache.add(cacheKey);
      continue;
    }

    svgCache.set(cacheKey, svg);
    return { name: parsed.name, style, svg };
  }

  const styleLabel =
    parsed.styles.length === 1 ? parsed.styles[0] : 'solid/regular/brands';
  throw new Error(
    `Icon "${parsed.name}" was not found in FontAwesome Free (${styleLabel}).`
  );
}
