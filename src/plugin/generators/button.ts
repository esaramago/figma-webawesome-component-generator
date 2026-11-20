import type {
  ButtonAppearance,
  ButtonIconOptions,
  ComponentSize,
  FigmaColor,
  ResolvedWebAwesomeStyles,
  SemanticVariant,
} from '../../shared/types'
import { arrangeComponentSetBlocks } from '../utils/canvas-layout'
import {
  buildComponentDocsSection,
  createVariantInstance,
  type GeneratedComponentResult,
} from '../utils/docs-layout'
import {
  createTextNode,
  fontForWeight,
  setSolidFill,
  setSolidStroke,
  type LoadedFontSet,
} from '../utils/figma-helpers'
import {
  createIconInstanceSlot,
  ensureIconComponent,
  getLibraryPreferredIconValues,
} from '../utils/icon-library'

// Exact Web Awesome docs order
const VARIANTS: SemanticVariant[] = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
]

const VARIANT_LABELS: Record<SemanticVariant, string> = {
  neutral: 'Neutral',
  brand: 'Brand',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
}

const APPEARANCES: ButtonAppearance[] = [
  'accent',
  'filled-outlined',
  'filled',
  'outlined',
  'plain',
]

const APPEARANCE_LABELS: Record<ButtonAppearance, string> = {
  accent: 'Accent',
  'filled-outlined': 'Filled-Outlined',
  filled: 'Filled',
  outlined: 'Outlined',
  plain: 'Plain',
}

const SIZES: ComponentSize[] = ['s', 'm', 'l']

const SIZE_LABELS: Record<ComponentSize, string> = {
  s: 'Small',
  m: 'Medium',
  l: 'Large',
}

const STATES = ['default', 'disabled'] as const
type ButtonState = (typeof STATES)[number]

interface ButtonVisualTokens {
  background: FigmaColor | null
  border: FigmaColor | null
  text: FigmaColor
}

function buttonVariantName(
  variant: SemanticVariant,
  appearance: ButtonAppearance,
  size: ComponentSize,
  state: ButtonState,
): string {
  return `Variant=${variant}, Appearance=${appearance}, Size=${size}, State=${state}`
}

function getButtonColors(
  styles: ResolvedWebAwesomeStyles,
  variant: SemanticVariant,
  appearance: ButtonAppearance,
): ButtonVisualTokens {
  const tokens = styles.variants[variant]
  switch (appearance) {
    case 'accent':
      return {
        background: tokens.fillLoud,
        border: null,
        text: tokens.onLoud,
      }
    case 'filled':
      return {
        background: tokens.fillNormal,
        border: null,
        text: tokens.onNormal,
      }
    case 'outlined':
      return {
        background: null,
        border: tokens.borderLoud,
        text: tokens.onQuiet,
      }
    case 'filled-outlined':
      return {
        background: tokens.fillNormal,
        border: tokens.borderNormal,
        text: tokens.onNormal,
      }
    case 'plain':
      return {
        background: null,
        border: null,
        text: tokens.onQuiet,
      }
  }
}

export function generateButtonComponentSet(
  styles: ResolvedWebAwesomeStyles,
  fonts: LoadedFontSet,
  buttonIcons?: ButtonIconOptions,
  buttonPill = false,
): GeneratedComponentResult {
  const components: ComponentNode[] = []
  const variantMap = new Map<string, ComponentNode>()
  const labelFont = fontForWeight(fonts, styles.fontWeight.action)

  const startIconComponent = ensureIconComponent(
    buttonIcons?.startIconName ?? 'plus',
    buttonIcons?.startIconSvg,
  )
  const endIconComponent = ensureIconComponent(
    buttonIcons?.endIconName ?? 'arrow-right',
    buttonIcons?.endIconSvg,
  )

  // Outer loops group into (Size x State) blocks; each block is a 5x5 Variant x Appearance matrix
  for (const size of SIZES) {
    const sizeMetrics = styles.sizes[size]

    for (const state of STATES) {
      for (const variant of VARIANTS) {
        for (const appearance of APPEARANCES) {
          const colors = getButtonColors(styles, variant, appearance)
          const component = figma.createComponent()
          const name = buttonVariantName(variant, appearance, size, state)
          component.name = name

          // Auto Layout container matching `.button` in wa-button
          component.layoutMode = 'HORIZONTAL'
          component.primaryAxisSizingMode = 'AUTO'
          component.counterAxisSizingMode = 'FIXED'
          component.primaryAxisAlignItems = 'CENTER'
          component.counterAxisAlignItems = 'CENTER'
          component.paddingLeft = sizeMetrics.formControlPaddingInline
          component.paddingRight = sizeMetrics.formControlPaddingInline
          component.paddingTop = 0
          component.paddingBottom = 0
          component.itemSpacing = sizeMetrics.buttonIconGap
          component.cornerRadius = buttonPill
            ? styles.border.radiusPill
            : styles.formControl.borderRadius
          component.clipsContent = false

          // Apply resolved fills, borders, and disabled opacity
          setSolidFill(component, colors.background)
          setSolidStroke(
            component,
            colors.border,
            styles.formControl.borderWidth,
          )
          component.opacity = state === 'disabled' ? 0.5 : 1

          // Optional Start Icon slot (swappable instance)
          const startIcon = createIconInstanceSlot(
            'Start Icon',
            startIconComponent,
            sizeMetrics.iconSize,
            colors.text,
          )
          startIcon.visible = false
          component.appendChild(startIcon)

          // Label text
          const label = createTextNode({
            name: 'Label',
            characters: 'Button',
            fontName: labelFont,
            fontSize: sizeMetrics.fontSize,
            lineHeightRatio: styles.lineHeight.condensed,
            color: colors.text,
          })
          component.appendChild(label)

          // Optional End Icon slot (swappable instance)
          const endIcon = createIconInstanceSlot(
            'End Icon',
            endIconComponent,
            sizeMetrics.iconSize,
            colors.text,
          )
          endIcon.visible = false
          component.appendChild(endIcon)

          // Set exact form-control height while preserving horizontal hug (AUTO)
          component.resize(component.width, sizeMetrics.formControlHeight)
          component.primaryAxisSizingMode = 'AUTO'
          component.counterAxisSizingMode = 'FIXED'

          components.push(component)
          variantMap.set(name, component)
        }
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, figma.currentPage)
  componentSet.name = 'Button (wa-button)'

  // Define Component Properties on the ComponentSet
  const preferredIconValues = getLibraryPreferredIconValues()
  const labelPropKey = componentSet.addComponentProperty(
    'Label',
    'TEXT',
    'Button',
  )
  const startIconPropKey = componentSet.addComponentProperty(
    'Show Start Icon',
    'BOOLEAN',
    false,
  )
  const startIconSwapPropKey = componentSet.addComponentProperty(
    'Start Icon',
    'INSTANCE_SWAP',
    startIconComponent.id,
    preferredIconValues.length > 0
      ? { preferredValues: preferredIconValues }
      : undefined,
  )
  const endIconPropKey = componentSet.addComponentProperty(
    'Show End Icon',
    'BOOLEAN',
    false,
  )
  const endIconSwapPropKey = componentSet.addComponentProperty(
    'End Icon',
    'INSTANCE_SWAP',
    endIconComponent.id,
    preferredIconValues.length > 0
      ? { preferredValues: preferredIconValues }
      : undefined,
  )

  // Bind Component Properties to each variant's inner layers
  for (const variant of componentSet.children) {
    if (variant.type !== 'COMPONENT') continue

    const labelNode = variant.findOne(
      (n) => n.type === 'TEXT' && n.name === 'Label',
    ) as TextNode | null
    if (labelNode) {
      labelNode.componentPropertyReferences = { characters: labelPropKey }
    }

    const startNode = variant.findOne(
      (n) => n.type === 'INSTANCE' && n.name === 'Start Icon',
    ) as InstanceNode | null
    if (startNode) {
      startNode.componentPropertyReferences = {
        visible: startIconPropKey,
        mainComponent: startIconSwapPropKey,
      }
    }

    const endNode = variant.findOne(
      (n) => n.type === 'INSTANCE' && n.name === 'End Icon',
    ) as InstanceNode | null
    if (endNode) {
      endNode.componentPropertyReferences = {
        visible: endIconPropKey,
        mainComponent: endIconSwapPropKey,
      }
    }
  }

  // 2 block columns (default | disabled) x 3 block rows (s, m, l), each a 5x5 matrix
  arrangeComponentSetBlocks(componentSet, {
    colsPerBlock: APPEARANCES.length,
    rowsPerBlock: VARIANTS.length,
    blockColumns: STATES.length,
    gapX: 16,
    gapY: 16,
    blockGapX: 56,
    blockGapY: 48,
    padding: 32,
  })

  // Build Web Awesome docs-style showcase using live instances
  const variantRow = VARIANTS.map((variant) =>
    createVariantInstance(
      variantMap,
      buttonVariantName(variant, 'accent', 'm', 'default'),
      { [labelPropKey]: VARIANT_LABELS[variant] },
    ),
  )

  const appearanceRows = VARIANTS.map((variant) =>
    APPEARANCES.map((appearance) =>
      createVariantInstance(
        variantMap,
        buttonVariantName(variant, appearance, 'm', 'default'),
        { [labelPropKey]: APPEARANCE_LABELS[appearance] },
      ),
    ),
  )

  const sizeRow = SIZES.map((size) =>
    createVariantInstance(
      variantMap,
      buttonVariantName('neutral', 'accent', size, 'default'),
      { [labelPropKey]: SIZE_LABELS[size] },
    ),
  )

  const iconsRow = [
    createVariantInstance(
      variantMap,
      buttonVariantName('neutral', 'filled-outlined', 'm', 'default'),
      { [labelPropKey]: 'Start Icon', [startIconPropKey]: true },
    ),
    createVariantInstance(
      variantMap,
      buttonVariantName('neutral', 'filled-outlined', 'm', 'default'),
      { [labelPropKey]: 'End Icon', [endIconPropKey]: true },
    ),
    createVariantInstance(
      variantMap,
      buttonVariantName('neutral', 'filled-outlined', 'm', 'default'),
      {
        [labelPropKey]: 'Both Icons',
        [startIconPropKey]: true,
        [endIconPropKey]: true,
      },
    ),
  ]

  const disabledRow = VARIANTS.map((variant) =>
    createVariantInstance(
      variantMap,
      buttonVariantName(variant, 'accent', 'm', 'disabled'),
      { [labelPropKey]: VARIANT_LABELS[variant] },
    ),
  )

  const section = buildComponentDocsSection(
    {
      sectionName: 'Button (wa-button)',
      title: 'Button',
      tag: '<wa-button>',
      description: 'Buttons represent actions that are available to the user.',
      specimens: [
        {
          title: 'Variant',
          description:
            "Use the variant attribute to set the button's semantic variant.",
          rows: [variantRow],
        },
        {
          title: 'Appearance',
          description:
            "Use the appearance attribute to change the button's visual appearance. Pair it with any variant for the full matrix.",
          rows: appearanceRows,
        },
        {
          title: 'Size',
          description: "Use the size attribute to change a button's size.",
          rows: [sizeRow],
        },
        {
          title: 'Icons',
          description:
            'Toggle Show Start Icon / Show End Icon and swap Start Icon / End Icon in the right sidebar.',
          rows: [iconsRow],
        },
        {
          title: 'Disabled',
          description: 'Use the disabled state to disable a button.',
          rows: [disabledRow],
        },
      ],
    },
    componentSet,
    styles,
    fonts,
  )

  return { rootNode: section, componentSet }
}
