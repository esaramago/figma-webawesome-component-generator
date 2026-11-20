import type { FigmaColor } from '../../shared/types';
import { setSolidFill } from './figma-helpers';

function createFallbackPlusVector(size: number, color: FigmaColor): VectorNode {
  const glyphSize = Math.max(8, Math.round(size * 0.72));
  const stroke = Math.max(1.5, Math.round(size * 0.11 * 10) / 10);

  const vector = figma.createVector();
  vector.name = 'Icon Vector';
  const half = glyphSize / 2;
  vector.vectorPaths = [
    {
      windingRule: 'NONZERO',
      data: `M ${half} 0 L ${half} ${glyphSize} M 0 ${half} L ${glyphSize} ${half}`,
    },
  ];
  vector.resize(glyphSize, glyphSize);
  vector.fills = [];
  vector.strokes = [
    {
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b },
      opacity: color.a,
    },
  ];
  vector.strokeWeight = stroke;
  vector.strokeCap = 'ROUND';
  vector.strokeJoin = 'ROUND';
  setSolidFill(vector, null);
  return vector;
}

function createSvgIconVector(
  slotFrame: FrameNode,
  size: number,
  color: FigmaColor,
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

    const glyphSize = Math.max(8, Math.round(size * 0.85));
    svgFrame.rescale(glyphSize / maxDim);

    const vector = figma.flatten([...svgFrame.children], slotFrame);
    vector.name = 'Icon Vector';
    setSolidFill(vector, color);
    vector.strokes = [];
    svgFrame.remove();
    return vector;
  } catch {
    if (svgFrame && !svgFrame.removed) {
      svgFrame.remove();
    }
    return null;
  }
}

/**
 * Replaces the contents of an icon slot frame with either a FontAwesome SVG
 * vector or the fallback plus vector, scaled to `size` and tinted to `color`.
 */
export function applyIconToSlot(
  slotFrame: FrameNode,
  size: number,
  color: FigmaColor,
  svgMarkup?: string
): void {
  for (const child of [...slotFrame.children]) {
    child.remove();
  }

  if (svgMarkup) {
    const svgVector = createSvgIconVector(slotFrame, size, color, svgMarkup);
    if (svgVector) {
      return;
    }
  }

  slotFrame.appendChild(createFallbackPlusVector(size, color));
}

/**
 * Creates a clean icon slot frame (for Button `start` / `end` slots)
 * sized proportionally to the component's font size (`1em`).
 */
export function createIconSlot(
  name: string,
  size: number,
  color: FigmaColor,
  svgMarkup?: string
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(size, size);
  frame.fills = [];
  frame.clipsContent = false;
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';

  applyIconToSlot(frame, size, color, svgMarkup);
  return frame;
}
