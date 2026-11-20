import type { FigmaColor } from '../../shared/types';
import { setSolidFill } from './figma-helpers';

export const ICON_LIBRARY_NAME = 'Icons (wa-icon)';

const BASE_ICON_SIZE = 16;
const DEFAULT_ICON_COLOR: FigmaColor = { r: 0.12, g: 0.14, b: 0.16, a: 1 };

const FALLBACK_PLUS_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 1 1 0-2h4V3a1 1 0 0 1 1-1Z"/></svg>';

function normalizeIconName(name?: string): string {
  const cleaned = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/^icon\s*\/\s*/, '')
    .replace(/^fa-/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'plus';
}

function createIconVectorInComponent(
  component: ComponentNode,
  svgMarkup: string
): VectorNode | null {
  let svgFrame: FrameNode | null = null;
  try {
    svgFrame = figma.createNodeFromSvg(svgMarkup);
    const maxDim = Math.max(svgFrame.width, svgFrame.height);
    if (maxDim <= 0 || svgFrame.children.length === 0) {
      svgFrame.remove();
      return null;
    }

    const glyphSize = Math.max(8, Math.round(BASE_ICON_SIZE * 0.85));
    svgFrame.rescale(glyphSize / maxDim);

    const vector = figma.flatten([...svgFrame.children], component);
    vector.name = 'Icon Vector';
    setSolidFill(vector, DEFAULT_ICON_COLOR);
    vector.strokes = [];
    vector.x = (BASE_ICON_SIZE - vector.width) / 2;
    vector.y = (BASE_ICON_SIZE - vector.height) / 2;
    vector.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    svgFrame.remove();
    return vector;
  } catch {
    if (svgFrame && !svgFrame.removed) {
      svgFrame.remove();
    }
    return null;
  }
}

function populateIconComponent(
  component: ComponentNode,
  svgMarkup?: string
): void {
  for (const child of [...component.children]) {
    child.remove();
  }

  if (svgMarkup) {
    const vector = createIconVectorInComponent(component, svgMarkup);
    if (vector) return;
  }

  createIconVectorInComponent(component, FALLBACK_PLUS_SVG);
}

/**
 * Finds or creates the page-level `Icons (wa-icon)` container frame that holds
 * reusable icon components for Figma `INSTANCE_SWAP` properties.
 */
export function getOrCreateIconLibraryFrame(): FrameNode {
  const existing = figma.currentPage.findOne(
    (node) => node.type === 'FRAME' && node.name === ICON_LIBRARY_NAME
  ) as FrameNode | null;
  if (existing) {
    return existing;
  }

  const existingNodes = [...figma.currentPage.children];

  const container = figma.createFrame();
  container.name = ICON_LIBRARY_NAME;
  container.layoutMode = 'HORIZONTAL';
  container.layoutWrap = 'WRAP';
  container.primaryAxisSizingMode = 'FIXED';
  container.counterAxisSizingMode = 'AUTO';
  container.paddingTop = 20;
  container.paddingBottom = 20;
  container.paddingLeft = 20;
  container.paddingRight = 20;
  container.itemSpacing = 16;
  container.counterAxisSpacing = 16;
  container.cornerRadius = 12;
  container.clipsContent = false;
  container.resize(320, 56);
  container.fills = [
    {
      type: 'SOLID',
      color: { r: 0.985, g: 0.985, b: 0.99 },
      opacity: 1,
    },
  ];
  container.strokes = [
    {
      type: 'SOLID',
      color: { r: 0.88, g: 0.89, b: 0.91 },
      opacity: 1,
    },
  ];
  container.strokeWeight = 1;

  if (existingNodes.length > 0) {
    let minX = Infinity;
    let maxBottom = -Infinity;
    for (const node of existingNodes) {
      if (node.x < minX) minX = node.x;
      const bottom = node.y + node.height;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    container.x = Number.isFinite(minX) ? minX : 0;
    container.y = Number.isFinite(maxBottom) ? maxBottom + 120 : 0;
  } else {
    container.x = 0;
    container.y = 0;
  }

  figma.currentPage.appendChild(container);
  return container;
}

/**
 * Ensures a reusable `Icon / <name>` ComponentNode exists inside `Icons (wa-icon)`
 * with a standardized flattened `Icon Vector` layer so Figma preserves color overrides
 * across `INSTANCE_SWAP`.
 */
export function ensureIconComponent(
  name?: string,
  svgMarkup?: string
): ComponentNode {
  const container = getOrCreateIconLibraryFrame();
  const normalized = normalizeIconName(name);
  const componentName = `Icon / ${normalized}`;

  const existing = container.children.find(
    (child): child is ComponentNode =>
      child.type === 'COMPONENT' && child.name === componentName
  );
  if (existing) {
    return existing;
  }

  const component = figma.createComponent();
  component.name = componentName;
  component.resize(BASE_ICON_SIZE, BASE_ICON_SIZE);
  component.fills = [];
  component.clipsContent = false;

  populateIconComponent(component, svgMarkup);
  container.appendChild(component);
  return component;
}

/**
 * Returns all icon components in `Icons (wa-icon)` as `INSTANCE_SWAP` preferredValues.
 */
export function getLibraryPreferredIconValues(): InstanceSwapPreferredValue[] {
  const container = figma.currentPage.findOne(
    (node) => node.type === 'FRAME' && node.name === ICON_LIBRARY_NAME
  ) as FrameNode | null;
  if (!container) return [];

  const values: InstanceSwapPreferredValue[] = [];
  const seenKeys = new Set<string>();

  for (const child of container.children) {
    if (child.type === 'COMPONENT' && child.key && !seenKeys.has(child.key)) {
      seenKeys.add(child.key);
      values.push({ type: 'COMPONENT', key: child.key });
    }
  }

  return values;
}

/**
 * Applies a solid fill color override to the standardized `Icon Vector` inside an
 * icon instance.
 */
export function tintIconInstance(
  instance: InstanceNode,
  color: FigmaColor
): void {
  const vector = instance.findOne(
    (n) => n.type === 'VECTOR' && n.name === 'Icon Vector'
  ) as VectorNode | null;
  if (vector) {
    setSolidFill(vector, color);
    vector.strokes = [];
  }
}

/**
 * Creates a sized, color-tinted icon `InstanceNode` for a Button `Start Icon` / `End Icon` slot.
 */
export function createIconInstanceSlot(
  slotName: string,
  iconComponent: ComponentNode,
  size: number,
  color: FigmaColor
): InstanceNode {
  const instance = iconComponent.createInstance();
  instance.name = slotName;
  instance.resize(size, size);
  tintIconInstance(instance, color);
  return instance;
}
