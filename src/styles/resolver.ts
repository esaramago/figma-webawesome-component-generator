import { parseCssColorToFigma } from '../shared/color';
import type {
  ComponentSize,
  FigmaColor,
  ResolvedWebAwesomeStyles,
  SemanticColorTokens,
  SemanticVariant,
  SizeMetrics,
} from '../shared/types';

const SEMANTIC_VARIANTS: SemanticVariant[] = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
];

const SIZES: ComponentSize[] = ['s', 'm', 'l'];

class StyleProbe {
  private readonly root: HTMLDivElement;
  private readonly colorEl: HTMLDivElement;
  private readonly lengthEl: HTMLDivElement;
  private readonly canvasCtx: CanvasRenderingContext2D | null;

  constructor() {
    this.root = document.createElement('div');
    // Inherit :root tokens (including webawesome-theme.css scale overrides) instead of
    // re-applying .wa-light here, which would reset --wa-*-scale back to 1.
    this.root.setAttribute('aria-hidden', 'true');
    this.root.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;font-size:16px;';

    this.colorEl = document.createElement('div');
    this.lengthEl = document.createElement('div');
    this.lengthEl.style.boxSizing = 'content-box';

    this.root.appendChild(this.colorEl);
    this.root.appendChild(this.lengthEl);
    document.body.appendChild(this.root);

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    this.canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
  }

  resolveColor(cssExpr: string): FigmaColor {
    this.colorEl.style.color = '';
    this.colorEl.style.color = cssExpr;
    const computed = getComputedStyle(this.colorEl).color;

    if (
      computed.startsWith('rgb') ||
      computed.startsWith('#') ||
      computed.startsWith('color(srgb') ||
      computed === 'transparent'
    ) {
      return parseCssColorToFigma(computed);
    }

    // Fallback for modern color spaces (e.g. oklch / oklab / color-mix) via 1x1 sRGB canvas rasterization
    if (this.canvasCtx && computed) {
      this.canvasCtx.clearRect(0, 0, 1, 1);
      this.canvasCtx.fillStyle = '#000000';
      this.canvasCtx.fillStyle = computed;
      this.canvasCtx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = this.canvasCtx.getImageData(0, 0, 1, 1).data;
      return {
        r: r / 255,
        g: g / 255,
        b: b / 255,
        a: a / 255,
      };
    }

    return parseCssColorToFigma(computed);
  }

  resolvePx(cssExpr: string, contextFontSizeCss = '16px'): number {
    this.lengthEl.style.fontSize = contextFontSizeCss;
    this.lengthEl.style.width = '';
    this.lengthEl.style.width = cssExpr;
    const computed = parseFloat(getComputedStyle(this.lengthEl).width);
    return Number.isFinite(computed) ? Math.round(computed * 100) / 100 : 0;
  }

  resolveFontSizePx(cssExpr: string, parentFontSizeCss = '16px'): number {
    this.root.style.fontSize = parentFontSizeCss;
    this.lengthEl.style.fontSize = '';
    this.lengthEl.style.fontSize = cssExpr;
    const computed = parseFloat(getComputedStyle(this.lengthEl).fontSize);
    this.root.style.fontSize = '16px';
    return Number.isFinite(computed) ? Math.round(computed * 100) / 100 : 16;
  }

  resolveNumber(varName: string, fallback: number): number {
    const raw = getComputedStyle(this.root).getPropertyValue(varName).trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  destroy(): void {
    this.root.remove();
  }
}

/**
 * Reads and computes all Web Awesome CSS custom properties (`--wa-*`)
 * from the active document (Web Awesome base Light theme + `src/css/webawesome-theme.css` overrides).
 */
export function resolveWebAwesomeStyles(): ResolvedWebAwesomeStyles {
  const probe = new StyleProbe();

  try {
    const variants = {} as Record<SemanticVariant, SemanticColorTokens>;

    for (const variant of SEMANTIC_VARIANTS) {
      variants[variant] = {
        fillQuiet: probe.resolveColor(`var(--wa-color-${variant}-fill-quiet)`),
        fillNormal: probe.resolveColor(`var(--wa-color-${variant}-fill-normal)`),
        fillLoud: probe.resolveColor(`var(--wa-color-${variant}-fill-loud)`),
        borderQuiet: probe.resolveColor(`var(--wa-color-${variant}-border-quiet)`),
        borderNormal: probe.resolveColor(`var(--wa-color-${variant}-border-normal)`),
        borderLoud: probe.resolveColor(`var(--wa-color-${variant}-border-loud)`),
        onQuiet: probe.resolveColor(`var(--wa-color-${variant}-on-quiet)`),
        onNormal: probe.resolveColor(`var(--wa-color-${variant}-on-normal)`),
        onLoud: probe.resolveColor(`var(--wa-color-${variant}-on-loud)`),
      };
    }

    const sizes = {} as Record<ComponentSize, SizeMetrics>;

    for (const size of SIZES) {
      const sizeVar = `var(--wa-font-size-${size})`;
      const fontSize = probe.resolveFontSizePx(sizeVar);
      const ctx = `${fontSize}px`;

      sizes[size] = {
        fontSize,
        formControlHeight: probe.resolvePx('var(--wa-form-control-height)', ctx),
        formControlPaddingInline: probe.resolvePx('var(--wa-form-control-padding-inline)', ctx),
        formControlPaddingBlock: probe.resolvePx('var(--wa-form-control-padding-block)', ctx),
        buttonIconGap: Math.round(probe.resolvePx('0.75em', ctx)),
        labelGap: Math.round(probe.resolvePx('0.5em', ctx)),
        hintGap: Math.round(probe.resolvePx('0.5em', ctx)),
        hintFontSize: probe.resolveFontSizePx('var(--wa-font-size-smaller)', ctx),
        iconSize: Math.round(fontSize),
      };
    }

    // Badge computes font-size as `max(var(--wa-font-size-3xs), 0.75em)` relative to 16px body
    const badgeFontSize = probe.resolveFontSizePx(
      'max(var(--wa-font-size-3xs), 0.75em)',
      '16px'
    );
    const badgeCtx = `${badgeFontSize}px`;

    return {
      variants,
      surface: {
        default: probe.resolveColor('var(--wa-color-surface-default)'),
        raised: probe.resolveColor('var(--wa-color-surface-raised)'),
        lowered: probe.resolveColor('var(--wa-color-surface-lowered)'),
        border: probe.resolveColor('var(--wa-color-surface-border)'),
      },
      text: {
        normal: probe.resolveColor('var(--wa-color-text-normal)'),
        quiet: probe.resolveColor('var(--wa-color-text-quiet)'),
      },
      focus: {
        color: probe.resolveColor('var(--wa-color-focus)'),
        ringWidth: probe.resolvePx('var(--wa-focus-ring-width)'),
        ringOffset: probe.resolvePx('var(--wa-focus-ring-offset)'),
      },
      border: {
        widthS: Math.max(1, probe.resolvePx('var(--wa-border-width-s)')),
        radiusS: probe.resolvePx('var(--wa-border-radius-s)'),
        radiusM: probe.resolvePx('var(--wa-border-radius-m)'),
        radiusL: probe.resolvePx('var(--wa-border-radius-l)'),
        radiusPill: probe.resolvePx('var(--wa-border-radius-pill)'),
      },
      fontWeight: {
        body: probe.resolveNumber('--wa-font-weight-body', 400),
        semibold: probe.resolveNumber('--wa-font-weight-semibold', 500),
        bold: probe.resolveNumber('--wa-font-weight-bold', 600),
        action: probe.resolveNumber('--wa-font-weight-action', 500),
      },
      lineHeight: {
        condensed: probe.resolveNumber('--wa-line-height-condensed', 1.2),
        normal: probe.resolveNumber('--wa-line-height-normal', 1.6),
      },
      formControl: {
        backgroundColor: probe.resolveColor('var(--wa-form-control-background-color)'),
        borderColor: probe.resolveColor('var(--wa-form-control-border-color)'),
        borderWidth: Math.max(1, probe.resolvePx('var(--wa-form-control-border-width)')),
        borderRadius: probe.resolvePx('var(--wa-form-control-border-radius)'),
        labelColor: probe.resolveColor('var(--wa-form-control-label-color)'),
        labelFontWeight: probe.resolveNumber('--wa-form-control-label-font-weight', 500),
        labelLineHeight: probe.resolveNumber('--wa-form-control-label-line-height', 1.2),
        valueColor: probe.resolveColor('var(--wa-form-control-value-color)'),
        valueFontWeight: probe.resolveNumber('--wa-form-control-value-font-weight', 400),
        valueLineHeight: probe.resolveNumber('--wa-form-control-value-line-height', 1.2),
        placeholderColor: probe.resolveColor('var(--wa-form-control-placeholder-color)'),
        hintColor: probe.resolveColor('var(--wa-form-control-hint-color)'),
        hintFontWeight: probe.resolveNumber('--wa-form-control-hint-font-weight', 400),
        hintLineHeight: probe.resolveNumber('--wa-form-control-hint-line-height', 1.6),
      },
      sizes,
      badge: {
        fontSize: badgeFontSize,
        paddingBlock: Math.round(probe.resolvePx('0.375em', badgeCtx)),
        paddingInline: Math.round(probe.resolvePx('0.625em', badgeCtx)),
        borderRadius: probe.resolvePx('var(--wa-border-radius-s)'),
        borderRadiusPill: probe.resolvePx('var(--wa-border-radius-pill)'),
        borderWidth: Math.max(1, probe.resolvePx('var(--wa-border-width-s)')),
        fontWeight: probe.resolveNumber('--wa-font-weight-semibold', 500),
        lineHeightRatio: 1,
      },
    };
  } finally {
    probe.destroy();
  }
}
