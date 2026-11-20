import type {
  ButtonIconOptions,
  ComponentId,
  ResolvedWebAwesomeStyles,
} from '../../shared/types';
import type { GeneratedComponentResult } from '../utils/docs-layout';
import type { LoadedFontSet } from '../utils/figma-helpers';
import { generateBadgeComponentSet } from './badge';
import { generateButtonComponentSet } from './button';
import { generateInputComponentSet } from './input';

export interface GenerateComponentOptions {
  buttonIcons?: ButtonIconOptions;
  buttonPill?: boolean;
}

export interface ComponentGeneratorDefinition {
  id: ComponentId;
  label: string;
  generate: (
    styles: ResolvedWebAwesomeStyles,
    fonts: LoadedFontSet,
    options?: GenerateComponentOptions
  ) => GeneratedComponentResult;
}

/**
 * Central component generator registry.
 * Add new Web Awesome component generators here to expose them to the plugin pipeline.
 */
export const COMPONENT_GENERATORS: Record<
  ComponentId,
  ComponentGeneratorDefinition
> = {
  button: {
    id: 'button',
    label: 'Button (wa-button)',
    generate: (styles, fonts, options) =>
      generateButtonComponentSet(
        styles,
        fonts,
        options?.buttonIcons,
        options?.buttonPill
      ),
  },
  badge: {
    id: 'badge',
    label: 'Badge (wa-badge)',
    generate: generateBadgeComponentSet,
  },
  input: {
    id: 'input',
    label: 'Input (wa-input)',
    generate: generateInputComponentSet,
  },
};
