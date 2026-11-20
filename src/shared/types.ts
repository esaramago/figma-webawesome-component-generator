export type ComponentId = 'button' | 'badge' | 'input';

export type SemanticVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

export type ButtonAppearance = 'accent' | 'filled' | 'outlined' | 'filled-outlined' | 'plain';
export type BadgeAppearance = 'accent' | 'filled' | 'outlined' | 'filled-outlined';
export type InputAppearance = 'outlined' | 'filled' | 'filled-outlined';

export type ComponentSize = 's' | 'm' | 'l';

export const SEMANTIC_VARIANTS: SemanticVariant[] = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
];

export const BUTTON_APPEARANCES: ButtonAppearance[] = [
  'accent',
  'filled-outlined',
  'filled',
  'outlined',
  'plain',
];

export const BADGE_APPEARANCES: BadgeAppearance[] = [
  'accent',
  'filled-outlined',
  'filled',
  'outlined',
];

export const INPUT_APPEARANCES: InputAppearance[] = [
  'outlined',
  'filled',
  'filled-outlined',
];

export const COMPONENT_SIZES: ComponentSize[] = ['s', 'm', 'l'];

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SemanticColorTokens {
  fillQuiet: FigmaColor;
  fillNormal: FigmaColor;
  fillLoud: FigmaColor;
  borderQuiet: FigmaColor;
  borderNormal: FigmaColor;
  borderLoud: FigmaColor;
  onQuiet: FigmaColor;
  onNormal: FigmaColor;
  onLoud: FigmaColor;
}

export interface SizeMetrics {
  fontSize: number;
  formControlHeight: number;
  formControlPaddingInline: number;
  formControlPaddingBlock: number;
  buttonIconGap: number;
  labelGap: number;
  hintGap: number;
  hintFontSize: number;
  iconSize: number;
}

export interface BadgeMetrics {
  fontSize: number;
  paddingBlock: number;
  paddingInline: number;
  borderRadius: number;
  borderRadiusPill: number;
  borderWidth: number;
  fontWeight: number;
  lineHeightRatio: number;
}

export interface ResolvedWebAwesomeStyles {
  variants: Record<SemanticVariant, SemanticColorTokens>;
  surface: {
    default: FigmaColor;
    raised: FigmaColor;
    lowered: FigmaColor;
    border: FigmaColor;
  };
  text: {
    normal: FigmaColor;
    quiet: FigmaColor;
  };
  focus: {
    color: FigmaColor;
    ringWidth: number;
    ringOffset: number;
  };
  border: {
    widthS: number;
    radiusS: number;
    radiusM: number;
    radiusL: number;
    radiusPill: number;
  };
  fontWeight: {
    body: number;
    semibold: number;
    bold: number;
    action: number;
  };
  lineHeight: {
    condensed: number;
    normal: number;
  };
  formControl: {
    backgroundColor: FigmaColor;
    borderColor: FigmaColor;
    borderWidth: number;
    borderRadius: number;
    labelColor: FigmaColor;
    labelFontWeight: number;
    labelLineHeight: number;
    valueColor: FigmaColor;
    valueFontWeight: number;
    valueLineHeight: number;
    placeholderColor: FigmaColor;
    hintColor: FigmaColor;
    hintFontWeight: number;
    hintLineHeight: number;
  };
  sizes: Record<ComponentSize, SizeMetrics>;
  badge: BadgeMetrics;
}

export interface ComponentCatalogItem {
  id: ComponentId;
  tag: string;
  label: string;
  description: string;
  variantCount: number;
}

export const COMPONENT_CATALOG: ComponentCatalogItem[] = [
  {
    id: 'button',
    tag: 'wa-button',
    label: 'Button',
    description: '5 variants · 5 appearances · 3 sizes · 2 states + icon slots',
    variantCount: 5 * 5 * 3 * 2,
  },
  {
    id: 'badge',
    tag: 'wa-badge',
    label: 'Badge',
    description: '5 variants · 4 appearances · pill toggle',
    variantCount: 5 * 4 * 2,
  },
  {
    id: 'input',
    tag: 'wa-input',
    label: 'Input',
    description: '3 sizes · 3 appearances · 3 states + label & hint',
    variantCount: 3 * 3 * 3,
  },
];

export interface ButtonIconOptions {
  startIconName?: string;
  startIconSvg?: string;
  endIconName?: string;
  endIconSvg?: string;
}

export type UiToPluginMessage =
  | {
      type: 'generate';
      components: ComponentId[];
      styles: ResolvedWebAwesomeStyles;
      fontFamily?: string;
      buttonIcons?: ButtonIconOptions;
      buttonPill?: boolean;
    }
  | {
      type: 'update-button-icons';
      icons: ButtonIconOptions;
    }
  | {
      type: 'cancel';
    };

export type PluginToUiMessage =
  | {
      type: 'progress';
      current: number;
      total: number;
      componentId: ComponentId;
      label: string;
    }
  | {
      type: 'complete';
      generated: Array<{
        id: ComponentId;
        name: string;
        variantCount: number;
      }>;
    }
  | {
      type: 'selection-changed';
      targetCount: number;
      description: string;
    }
  | {
      type: 'icons-updated';
      variantCount: number;
      instanceCount: number;
    }
  | {
      type: 'fonts-loaded';
      families: string[];
      defaultFamily: string;
    }
  | {
      type: 'error';
      message: string;
    };
