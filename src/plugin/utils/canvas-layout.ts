export interface GridLayoutOptions {
  columns: number;
  gapX?: number;
  gapY?: number;
  padding?: number;
}

export interface BlockGridLayoutOptions {
  /** Number of variant columns inside each visual block (e.g., 5 appearances) */
  colsPerBlock: number;
  /** Number of variant rows inside each visual block (e.g., 5 semantic variants) */
  rowsPerBlock: number;
  /** Number of visual blocks placed side-by-side horizontally (e.g., 2 states) */
  blockColumns: number;
  gapX?: number;
  gapY?: number;
  blockGapX?: number;
  blockGapY?: number;
  padding?: number;
}

function styleComponentSetContainer(componentSet: ComponentSetNode): void {
  componentSet.cornerRadius = 16;
  componentSet.fills = [
    {
      type: 'SOLID',
      color: { r: 0.985, g: 0.985, b: 0.99 },
      opacity: 1,
    },
  ];
}

/**
 * Arranges child variant components inside a ComponentSet into a clean,
 * evenly aligned grid and resizes the ComponentSet to fit with padding.
 */
export function arrangeComponentSetGrid(
  componentSet: ComponentSetNode,
  options: GridLayoutOptions
): void {
  const { columns, gapX = 24, gapY = 24, padding = 32 } = options;
  const children = componentSet.children.filter(
    (child): child is ComponentNode => child.type === 'COMPONENT'
  );

  if (children.length === 0) return;

  const colWidths = new Array<number>(columns).fill(0);
  const rowCount = Math.ceil(children.length / columns);
  const rowHeights = new Array<number>(rowCount).fill(0);

  children.forEach((child, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    colWidths[col] = Math.max(colWidths[col], child.width);
    rowHeights[row] = Math.max(rowHeights[row], child.height);
  });

  const colOffsets: number[] = [];
  let cursorX = padding;
  for (let c = 0; c < columns; c++) {
    colOffsets.push(cursorX);
    cursorX += colWidths[c] + gapX;
  }

  const rowOffsets: number[] = [];
  let cursorY = padding;
  for (let r = 0; r < rowCount; r++) {
    rowOffsets.push(cursorY);
    cursorY += rowHeights[r] + gapY;
  }

  children.forEach((child, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    child.x = colOffsets[col];
    child.y = rowOffsets[row];
  });

  const totalWidth =
    padding * 2 +
    colWidths.reduce((sum, w) => sum + w, 0) +
    Math.max(0, columns - 1) * gapX;
  const totalHeight =
    padding * 2 +
    rowHeights.reduce((sum, h) => sum + h, 0) +
    Math.max(0, rowCount - 1) * gapY;

  componentSet.resizeWithoutConstraints(totalWidth, totalHeight);
  styleComponentSetContainer(componentSet);
}

/**
 * Arranges child variant components inside a ComponentSet into distinct visual
 * matrix blocks (e.g. 5x5 Variant x Appearance blocks grouped by Size & State).
 */
export function arrangeComponentSetBlocks(
  componentSet: ComponentSetNode,
  options: BlockGridLayoutOptions
): void {
  const {
    colsPerBlock,
    rowsPerBlock,
    blockColumns,
    gapX = 16,
    gapY = 16,
    blockGapX = 56,
    blockGapY = 48,
    padding = 32,
  } = options;

  const children = componentSet.children.filter(
    (child): child is ComponentNode => child.type === 'COMPONENT'
  );

  if (children.length === 0) return;

  const itemsPerBlock = colsPerBlock * rowsPerBlock;
  const blockCount = Math.ceil(children.length / itemsPerBlock);
  const blockRows = Math.ceil(blockCount / blockColumns);

  const totalCols = blockColumns * colsPerBlock;
  const totalRows = blockRows * rowsPerBlock;

  const colWidths = new Array<number>(totalCols).fill(0);
  const rowHeights = new Array<number>(totalRows).fill(0);

  const placements: Array<{ child: ComponentNode; globalCol: number; globalRow: number }> = [];

  children.forEach((child, index) => {
    const blockIndex = Math.floor(index / itemsPerBlock);
    const indexInBlock = index % itemsPerBlock;

    const blockCol = blockIndex % blockColumns;
    const blockRow = Math.floor(blockIndex / blockColumns);

    const localCol = indexInBlock % colsPerBlock;
    const localRow = Math.floor(indexInBlock / colsPerBlock);

    const globalCol = blockCol * colsPerBlock + localCol;
    const globalRow = blockRow * rowsPerBlock + localRow;

    colWidths[globalCol] = Math.max(colWidths[globalCol], child.width);
    rowHeights[globalRow] = Math.max(rowHeights[globalRow], child.height);
    placements.push({ child, globalCol, globalRow });
  });

  const colOffsets: number[] = [];
  let cursorX = padding;
  for (let c = 0; c < totalCols; c++) {
    colOffsets.push(cursorX);
    const isEndOfBlock = (c + 1) % colsPerBlock === 0 && c < totalCols - 1;
    cursorX += colWidths[c] + (isEndOfBlock ? blockGapX : gapX);
  }

  const rowOffsets: number[] = [];
  let cursorY = padding;
  for (let r = 0; r < totalRows; r++) {
    rowOffsets.push(cursorY);
    const isEndOfBlock = (r + 1) % rowsPerBlock === 0 && r < totalRows - 1;
    cursorY += rowHeights[r] + (isEndOfBlock ? blockGapY : gapY);
  }

  for (const { child, globalCol, globalRow } of placements) {
    child.x = colOffsets[globalCol];
    child.y = rowOffsets[globalRow];
  }

  const totalWidth =
    colOffsets[totalCols - 1] + colWidths[totalCols - 1] + padding;
  const totalHeight =
    rowOffsets[totalRows - 1] + rowHeights[totalRows - 1] + padding;

  componentSet.resizeWithoutConstraints(totalWidth, totalHeight);
  styleComponentSetContainer(componentSet);
}

/**
 * Places newly generated top-level nodes (Sections or ComponentSets) cleanly on
 * the current page without overlapping any pre-existing nodes, then scrolls the
 * viewport to them.
 */
export function placeNodesOnCanvas(nodes: SceneNode[]): void {
  if (nodes.length === 0) return;

  const newNodeIds = new Set(nodes.map((n) => n.id));
  const existingNodes = figma.currentPage.children.filter(
    (node) => !newNodeIds.has(node.id)
  );

  let startX = 0;
  let startY = 0;

  if (existingNodes.length > 0) {
    let minX = Infinity;
    let maxBottom = -Infinity;
    for (const node of existingNodes) {
      if (node.x < minX) minX = node.x;
      const bottom = node.y + node.height;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    startX = Number.isFinite(minX) ? minX : 0;
    startY = Number.isFinite(maxBottom) ? maxBottom + 120 : 0;
  }

  let currentY = startY;
  const sectionGap = 120;

  for (const node of nodes) {
    node.x = startX;
    node.y = currentY;
    currentY += node.height + sectionGap;
  }

  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
}
