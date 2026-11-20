import type {
  ComponentSize,
  FigmaColor,
  InputAppearance,
  ResolvedWebAwesomeStyles,
} from '../../shared/types';
import { arrangeComponentSetBlocks } from '../utils/canvas-layout';
import {
  buildComponentDocsSection,
  createVariantInstance,
  type GeneratedComponentResult,
} from '../utils/docs-layout';
import {
  applyFocusRing,
  createTextNode,
  fontForWeight,
  setSolidFill,
  setSolidStroke,
  type LoadedFontSet,
} from '../utils/figma-helpers';

const SIZES: ComponentSize[] = ['s', 'm', 'l'];

const SIZE_LABELS: Record<ComponentSize, string> = {
  s: 'Small',
  m: 'Medium',
  l: 'Large',
};

const APPEARANCES: InputAppearance[] = ['outlined', 'filled', 'filled-outlined'];

const APPEARANCE_LABELS: Record<InputAppearance, string> = {
  outlined: 'Outlined',
  filled: 'Filled',
  'filled-outlined': 'Filled-Outlined',
};

const STATES = ['default', 'focus', 'disabled'] as const;
type InputState = (typeof STATES)[number];

const STATE_LABELS: Record<InputState, string> = {
  default: 'Default',
  focus: 'Focus',
  disabled: 'Disabled',
};

const DEFAULT_INPUT_WIDTH = 260;

interface InputFieldVisualTokens {
  background: FigmaColor;
  border: FigmaColor;
}

function inputVariantName(
  size: ComponentSize,
  appearance: InputAppearance,
  state: InputState
): string {
  return `Size=${size}, Appearance=${appearance}, State=${state}`;
}

function getInputFieldColors(
  styles: ResolvedWebAwesomeStyles,
  appearance: InputAppearance
): InputFieldVisualTokens {
  const quietFill = styles.variants.neutral.fillQuiet;

  switch (appearance) {
    case 'outlined':
      return {
        background: styles.formControl.backgroundColor,
        border: styles.formControl.borderColor,
      };
    case 'filled':
      return {
        background: quietFill,
        border: quietFill,
      };
    case 'filled-outlined':
      return {
        background: quietFill,
        border: styles.formControl.borderColor,
      };
  }
}

export function generateInputComponentSet(
  styles: ResolvedWebAwesomeStyles,
  fonts: LoadedFontSet
): GeneratedComponentResult {
  const components: ComponentNode[] = [];
  const variantMap = new Map<string, ComponentNode>();
  const labelFont = fontForWeight(fonts, styles.formControl.labelFontWeight);
  const valueFont = fontForWeight(fonts, styles.formControl.valueFontWeight);
  const hintFont = fontForWeight(fonts, styles.formControl.hintFontWeight);

  // Outer loop groups into 3 Size blocks (s, m, l); each block is 3 Appearances x 3 States
  for (const size of SIZES) {
    const sizeMetrics = styles.sizes[size];

    for (const appearance of APPEARANCES) {
      const fieldColors = getInputFieldColors(styles, appearance);

      for (const state of STATES) {
        const component = figma.createComponent();
        const name = inputVariantName(size, appearance, state);
        component.name = name;

        // Outer vertical Auto Layout matching form-control host
        component.layoutMode = 'VERTICAL';
        component.itemSpacing = sizeMetrics.labelGap;
        component.fills = [];
        component.clipsContent = false;
        component.resize(DEFAULT_INPUT_WIDTH, 100);
        component.primaryAxisSizingMode = 'AUTO';
        component.counterAxisSizingMode = 'FIXED';

        // 1. Optional Label
        const label = createTextNode({
          name: 'Label',
          characters: 'Label',
          fontName: labelFont,
          fontSize: sizeMetrics.fontSize,
          lineHeightRatio: styles.formControl.labelLineHeight,
          color: styles.formControl.labelColor,
        });
        label.textAutoResize = 'HEIGHT';
        label.layoutAlign = 'STRETCH';
        component.appendChild(label);

        // 2. Input Wrapper (`.text-field`)
        const inputWrapper = figma.createFrame();
        inputWrapper.name = 'Input Wrapper';
        inputWrapper.layoutMode = 'HORIZONTAL';
        inputWrapper.primaryAxisSizingMode = 'FIXED';
        inputWrapper.counterAxisSizingMode = 'FIXED';
        inputWrapper.primaryAxisAlignItems = 'MIN';
        inputWrapper.counterAxisAlignItems = 'CENTER';
        inputWrapper.paddingLeft = sizeMetrics.formControlPaddingInline;
        inputWrapper.paddingRight = sizeMetrics.formControlPaddingInline;
        inputWrapper.paddingTop = 0;
        inputWrapper.paddingBottom = 0;
        inputWrapper.cornerRadius = styles.formControl.borderRadius;
        // clipsContent must be true for Figma to render spread DROP_SHADOW focus rings
        inputWrapper.clipsContent = true;
        inputWrapper.resize(DEFAULT_INPUT_WIDTH, sizeMetrics.formControlHeight);
        inputWrapper.layoutAlign = 'STRETCH';

        setSolidFill(inputWrapper, fieldColors.background);
        setSolidStroke(
          inputWrapper,
          fieldColors.border,
          styles.formControl.borderWidth
        );

        if (state === 'focus') {
          applyFocusRing(
            inputWrapper,
            styles.focus.color,
            styles.focus.ringWidth,
            styles.focus.ringOffset
          );
        }

        if (state === 'disabled') {
          inputWrapper.opacity = 0.5;
        }

        const placeholder = createTextNode({
          name: 'Placeholder',
          characters: 'Placeholder',
          fontName: valueFont,
          fontSize: sizeMetrics.fontSize,
          lineHeightRatio: styles.formControl.valueLineHeight,
          color: styles.formControl.placeholderColor,
        });
        placeholder.layoutGrow = 1;
        placeholder.textTruncation = 'ENDING';
        inputWrapper.appendChild(placeholder);

        component.appendChild(inputWrapper);

        // 3. Optional Hint
        const hint = createTextNode({
          name: 'Hint',
          characters: 'Hint text',
          fontName: hintFont,
          fontSize: sizeMetrics.hintFontSize,
          lineHeightRatio: styles.formControl.hintLineHeight,
          color: styles.formControl.hintColor,
        });
        hint.textAutoResize = 'HEIGHT';
        hint.layoutAlign = 'STRETCH';
        component.appendChild(hint);

        components.push(component);
        variantMap.set(name, component);
      }
    }
  }

  const componentSet = figma.combineAsVariants(components, figma.currentPage);
  componentSet.name = 'Input (wa-input)';

  // Define Component Properties on the ComponentSet
  const showLabelPropKey = componentSet.addComponentProperty(
    'Show Label',
    'BOOLEAN',
    true
  );
  const labelPropKey = componentSet.addComponentProperty('Label', 'TEXT', 'Label');
  const placeholderPropKey = componentSet.addComponentProperty(
    'Placeholder',
    'TEXT',
    'Placeholder'
  );
  const showHintPropKey = componentSet.addComponentProperty(
    'Show Hint',
    'BOOLEAN',
    true
  );
  const hintPropKey = componentSet.addComponentProperty(
    'Hint',
    'TEXT',
    'Hint text'
  );

  for (const variant of componentSet.children) {
    if (variant.type !== 'COMPONENT') continue;

    const labelNode = variant.findOne(
      (n) => n.type === 'TEXT' && n.name === 'Label'
    ) as TextNode | null;
    if (labelNode) {
      labelNode.componentPropertyReferences = {
        visible: showLabelPropKey,
        characters: labelPropKey,
      };
    }

    const placeholderNode = variant.findOne(
      (n) => n.type === 'TEXT' && n.name === 'Placeholder'
    ) as TextNode | null;
    if (placeholderNode) {
      placeholderNode.componentPropertyReferences = {
        characters: placeholderPropKey,
      };
    }

    const hintNode = variant.findOne(
      (n) => n.type === 'TEXT' && n.name === 'Hint'
    ) as TextNode | null;
    if (hintNode) {
      hintNode.componentPropertyReferences = {
        visible: showHintPropKey,
        characters: hintPropKey,
      };
    }
  }

  // 3 stacked Size blocks (s, m, l), each a 3 Appearance x 3 State matrix
  arrangeComponentSetBlocks(componentSet, {
    colsPerBlock: STATES.length,
    rowsPerBlock: APPEARANCES.length,
    blockColumns: 1,
    gapX: 24,
    gapY: 24,
    blockGapX: 48,
    blockGapY: 48,
    padding: 32,
  });

  // Build Web Awesome docs-style showcase using live instances
  const appearanceRow = APPEARANCES.map((appearance) =>
    createVariantInstance(
      variantMap,
      inputVariantName('m', appearance, 'default'),
      {
        [showLabelPropKey]: true,
        [labelPropKey]: APPEARANCE_LABELS[appearance],
        [placeholderPropKey]: 'Type something...',
        [showHintPropKey]: false,
      }
    )
  );

  const sizeRow = SIZES.map((size) =>
    createVariantInstance(variantMap, inputVariantName(size, 'outlined', 'default'), {
      [showLabelPropKey]: true,
      [labelPropKey]: SIZE_LABELS[size],
      [placeholderPropKey]: `${SIZE_LABELS[size]} input`,
      [showHintPropKey]: false,
    })
  );

  const stateRow = STATES.map((state) =>
    createVariantInstance(variantMap, inputVariantName('m', 'outlined', state), {
      [showLabelPropKey]: true,
      [labelPropKey]: STATE_LABELS[state],
      [placeholderPropKey]: `${STATE_LABELS[state]} state`,
      [showHintPropKey]: false,
    })
  );

  const hintRow = [
    createVariantInstance(variantMap, inputVariantName('m', 'outlined', 'default'), {
      [showLabelPropKey]: true,
      [labelPropKey]: 'Nickname',
      [placeholderPropKey]: 'Enter your nickname',
      [showHintPropKey]: true,
      [hintPropKey]: 'What would you like people to call you?',
    }),
  ];

  const section = buildComponentDocsSection(
    {
      sectionName: 'Input (wa-input)',
      title: 'Input',
      tag: '<wa-input>',
      description: 'Inputs collect data from the user.',
      specimens: [
        {
          title: 'Appearance',
          description:
            "Use the appearance attribute to change the input's visual appearance.",
          rows: [appearanceRow],
          columnGap: 16,
          rowAlign: 'MIN',
        },
        {
          title: 'Size',
          description: "Use the size attribute to change an input's size.",
          rows: [sizeRow],
          columnGap: 16,
          rowAlign: 'MIN',
        },
        {
          title: 'States',
          description: 'Interactive and disabled states for form inputs.',
          rows: [stateRow],
          columnGap: 16,
          rowAlign: 'MIN',
        },
        {
          title: 'Hint Text',
          description: 'Use the Show Hint property to display helper text below the input.',
          rows: [hintRow],
          rowAlign: 'MIN',
        },
      ],
    },
    componentSet,
    styles,
    fonts
  );

  return { rootNode: section, componentSet };
}
