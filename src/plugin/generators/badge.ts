import type {
  BadgeAppearance,
  FigmaColor,
  ResolvedWebAwesomeStyles,
  SemanticVariant,
} from '../../shared/types';
import { arrangeComponentSetBlocks } from '../utils/canvas-layout';
import {
  buildComponentDocsSection,
  createVariantInstance,
  type GeneratedComponentResult,
} from '../utils/docs-layout';
import {
  createTextNode,
  fontForWeight,
  setSolidFill,
  setSolidStroke,
  type LoadedFontSet,
} from '../utils/figma-helpers';

// Exact Web Awesome docs order
const VARIANTS: SemanticVariant[] = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
];

const VARIANT_LABELS: Record<SemanticVariant, string> = {
  neutral: 'Neutral',
  brand: 'Brand',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
};

const APPEARANCES: BadgeAppearance[] = [
  'accent',
  'filled-outlined',
  'filled',
  'outlined',
];

const APPEARANCE_LABELS: Record<BadgeAppearance, string> = {
  accent: 'Accent',
  'filled-outlined': 'Filled-Outlined',
  filled: 'Filled',
  outlined: 'Outlined',
};

const PILL_OPTIONS = [false, true] as const;

interface BadgeVisualTokens {
  background: FigmaColor | null;
  border: FigmaColor | null;
  text: FigmaColor;
}

function badgeVariantName(
  variant: SemanticVariant,
  appearance: BadgeAppearance,
  pill: boolean
): string {
  return `Variant=${variant}, Appearance=${appearance}, Pill=${pill ? 'true' : 'false'}`;
}

function getBadgeColors(
  styles: ResolvedWebAwesomeStyles,
  variant: SemanticVariant,
  appearance: BadgeAppearance
): BadgeVisualTokens {
  const tokens = styles.variants[variant];
  switch (appearance) {
    case 'accent':
      return {
        background: tokens.fillLoud,
        border: null,
        text: tokens.onLoud,
      };
    case 'filled':
      return {
        background: tokens.fillNormal,
        border: null,
        text: tokens.onNormal,
      };
    case 'outlined':
      return {
        background: null,
        border: tokens.borderLoud,
        text: tokens.onQuiet,
      };
    case 'filled-outlined':
      return {
        background: tokens.fillNormal,
        border: tokens.borderNormal,
        text: tokens.onNormal,
      };
  }
}

export function generateBadgeComponentSet(
  styles: ResolvedWebAwesomeStyles,
  fonts: LoadedFontSet
): GeneratedComponentResult {
  const components: ComponentNode[] = [];
  const variantMap = new Map<string, ComponentNode>();
  const badgeFont = fontForWeight(fonts, styles.badge.fontWeight);

  // Outer loop groups into 2 blocks (Pill=false | Pill=true), each a 5x4 Variant x Appearance matrix
  for (const pill of PILL_OPTIONS) {
    for (const variant of VARIANTS) {
      for (const appearance of APPEARANCES) {
        const colors = getBadgeColors(styles, variant, appearance);
        const component = figma.createComponent();
        const name = badgeVariantName(variant, appearance, pill);
        component.name = name;

        // Auto Layout matching wa-badge host styles
        component.layoutMode = 'HORIZONTAL';
        component.primaryAxisSizingMode = 'AUTO';
        component.counterAxisSizingMode = 'AUTO';
        component.primaryAxisAlignItems = 'CENTER';
        component.counterAxisAlignItems = 'CENTER';
        component.paddingTop = styles.badge.paddingBlock;
        component.paddingBottom = styles.badge.paddingBlock;
        component.paddingLeft = styles.badge.paddingInline;
        component.paddingRight = styles.badge.paddingInline;
        component.cornerRadius = pill
          ? styles.badge.borderRadiusPill
          : styles.badge.borderRadius;
        component.clipsContent = false;

        setSolidFill(component, colors.background);
        setSolidStroke(component, colors.border, styles.badge.borderWidth);

        const label = createTextNode({
          name: 'Label',
          characters: 'Badge',
          fontName: badgeFont,
          fontSize: styles.badge.fontSize,
          lineHeightRatio: styles.badge.lineHeightRatio,
          color: colors.text,
        });

        component.appendChild(label);
        components.push(component);
        variantMap.set(name, component);
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, figma.currentPage);
  componentSet.name = 'Badge (wa-badge)';

  const labelPropKey = componentSet.addComponentProperty('Label', 'TEXT', 'Badge');

  for (const variant of componentSet.children) {
    if (variant.type !== 'COMPONENT') continue;
    const labelNode = variant.findOne(
      (n) => n.type === 'TEXT' && n.name === 'Label'
    ) as TextNode | null;
    if (labelNode) {
      labelNode.componentPropertyReferences = { characters: labelPropKey };
    }
  }

  // 2 block columns (Standard | Pill), each a 5x4 Variant x Appearance matrix
  arrangeComponentSetBlocks(componentSet, {
    colsPerBlock: APPEARANCES.length,
    rowsPerBlock: VARIANTS.length,
    blockColumns: PILL_OPTIONS.length,
    gapX: 16,
    gapY: 16,
    blockGapX: 56,
    blockGapY: 48,
    padding: 32,
  });

  // Build Web Awesome docs-style showcase using live instances
  const variantRow = VARIANTS.map((variant) =>
    createVariantInstance(
      variantMap,
      badgeVariantName(variant, 'accent', false),
      { [labelPropKey]: VARIANT_LABELS[variant] }
    )
  );

  const appearanceRows = VARIANTS.map((variant) =>
    APPEARANCES.map((appearance) =>
      createVariantInstance(
        variantMap,
        badgeVariantName(variant, appearance, false),
        { [labelPropKey]: APPEARANCE_LABELS[appearance] }
      )
    )
  );

  const pillRow = VARIANTS.map((variant) =>
    createVariantInstance(
      variantMap,
      badgeVariantName(variant, 'accent', true),
      { [labelPropKey]: VARIANT_LABELS[variant] }
    )
  );

  const section = buildComponentDocsSection(
    {
      sectionName: 'Badge (wa-badge)',
      title: 'Badge',
      tag: '<wa-badge>',
      description: 'Badges are used to draw attention and display statuses or counts.',
      specimens: [
        {
          title: 'Variant',
          description: "Use the variant attribute to set the badge's semantic variant.",
          rows: [variantRow],
        },
        {
          title: 'Appearance',
          description:
            "Use the appearance attribute to change the badge's visual appearance. Pair it with any variant for the full matrix.",
          rows: appearanceRows,
        },
        {
          title: 'Pill',
          description: 'Use the pill attribute to give badges rounded edges.',
          rows: [pillRow],
        },
      ],
    },
    componentSet,
    styles,
    fonts
  );

  return { rootNode: section, componentSet };
}
