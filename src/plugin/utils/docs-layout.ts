import type { ResolvedWebAwesomeStyles } from '../../shared/types';
import {
  createTextNode,
  fontForWeight,
  setSolidFill,
  setSolidStroke,
  type LoadedFontSet,
} from './figma-helpers';

export interface SpecimenSectionSpec {
  title: string;
  description: string;
  /** Each inner array becomes one horizontal row inside the preview card */
  rows: InstanceNode[][];
  rowGap?: number;
  columnGap?: number;
  rowAlign?: 'MIN' | 'CENTER' | 'MAX';
}

export interface ComponentDocsSpec {
  /** Section title on canvas, e.g. "Button (wa-button)" */
  sectionName: string;
  /** Display title inside the docs header, e.g. "Button" */
  title: string;
  /** Custom element tag, e.g. "<wa-button>" */
  tag: string;
  /** Short component overview description */
  description: string;
  /** Ordered Web Awesome-style specimen sections */
  specimens: SpecimenSectionSpec[];
}

export interface GeneratedComponentResult {
  rootNode: SceneNode;
  componentSet: ComponentSetNode;
}

/**
 * Helper to create an instance of a specific variant and apply Component Properties.
 */
export function createVariantInstance(
  variantMap: Map<string, ComponentNode>,
  variantName: string,
  properties?: Record<string, string | boolean>
): InstanceNode {
  const component = variantMap.get(variantName);
  if (!component) {
    throw new Error(`Variant not found for showcase: "${variantName}"`);
  }

  const instance = component.createInstance();
  if (properties && Object.keys(properties).length > 0) {
    instance.setProperties(properties);
  }
  return instance;
}

function buildShowcaseFrame(
  spec: ComponentDocsSpec,
  styles: ResolvedWebAwesomeStyles,
  fonts: LoadedFontSet
): FrameNode {
  const headingFont = fontForWeight(fonts, styles.fontWeight.bold);
  const subheadingFont = fontForWeight(fonts, styles.fontWeight.semibold);
  const bodyFont = fontForWeight(fonts, styles.fontWeight.body);

  const showcase = figma.createFrame();
  showcase.name = `${spec.title} Docs Showcase`;
  showcase.layoutMode = 'VERTICAL';
  showcase.primaryAxisSizingMode = 'AUTO';
  showcase.counterAxisSizingMode = 'AUTO';
  showcase.paddingTop = 40;
  showcase.paddingBottom = 40;
  showcase.paddingLeft = 40;
  showcase.paddingRight = 40;
  showcase.itemSpacing = 32;
  showcase.cornerRadius = 16;
  showcase.clipsContent = false;
  setSolidFill(showcase, styles.surface.default);
  setSolidStroke(showcase, styles.surface.border, 1);

  // Header
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'AUTO';
  header.itemSpacing = 8;
  header.fills = [];
  header.clipsContent = false;

  const titleRow = figma.createFrame();
  titleRow.name = 'Title Row';
  titleRow.layoutMode = 'HORIZONTAL';
  titleRow.primaryAxisSizingMode = 'AUTO';
  titleRow.counterAxisSizingMode = 'AUTO';
  titleRow.counterAxisAlignItems = 'CENTER';
  titleRow.itemSpacing = 12;
  titleRow.fills = [];
  titleRow.clipsContent = false;

  const titleText = createTextNode({
    name: 'Title',
    characters: spec.title,
    fontName: headingFont,
    fontSize: 28,
    lineHeightRatio: 1.2,
    color: styles.text.normal,
  });
  titleRow.appendChild(titleText);

  const tagPill = figma.createFrame();
  tagPill.name = 'Tag';
  tagPill.layoutMode = 'HORIZONTAL';
  tagPill.primaryAxisSizingMode = 'AUTO';
  tagPill.counterAxisSizingMode = 'AUTO';
  tagPill.paddingTop = 4;
  tagPill.paddingBottom = 4;
  tagPill.paddingLeft = 8;
  tagPill.paddingRight = 8;
  tagPill.cornerRadius = 6;
  setSolidFill(tagPill, styles.surface.lowered);
  setSolidStroke(tagPill, styles.surface.border, 1);

  const tagText = createTextNode({
    name: 'Tag Label',
    characters: spec.tag,
    fontName: subheadingFont,
    fontSize: 12,
    lineHeightRatio: 1.2,
    color: styles.text.quiet,
  });
  tagPill.appendChild(tagText);
  titleRow.appendChild(tagPill);

  header.appendChild(titleRow);

  const descText = createTextNode({
    name: 'Description',
    characters: spec.description,
    fontName: bodyFont,
    fontSize: 14,
    lineHeightRatio: 1.5,
    color: styles.text.quiet,
  });
  header.appendChild(descText);

  showcase.appendChild(header);

  // Specimen sections
  for (const specimen of spec.specimens) {
    const sectionFrame = figma.createFrame();
    sectionFrame.name = specimen.title;
    sectionFrame.layoutMode = 'VERTICAL';
    sectionFrame.primaryAxisSizingMode = 'AUTO';
    sectionFrame.counterAxisSizingMode = 'AUTO';
    sectionFrame.itemSpacing = 12;
    sectionFrame.fills = [];
    sectionFrame.clipsContent = false;
    sectionFrame.layoutAlign = 'STRETCH';

    const sectionHeader = figma.createFrame();
    sectionHeader.name = 'Section Header';
    sectionHeader.layoutMode = 'VERTICAL';
    sectionHeader.primaryAxisSizingMode = 'AUTO';
    sectionHeader.counterAxisSizingMode = 'AUTO';
    sectionHeader.itemSpacing = 4;
    sectionHeader.fills = [];
    sectionHeader.clipsContent = false;

    const sectionTitle = createTextNode({
      name: 'Heading',
      characters: specimen.title,
      fontName: headingFont,
      fontSize: 18,
      lineHeightRatio: 1.3,
      color: styles.text.normal,
    });
    sectionHeader.appendChild(sectionTitle);

    const sectionDesc = createTextNode({
      name: 'Description',
      characters: specimen.description,
      fontName: bodyFont,
      fontSize: 13,
      lineHeightRatio: 1.4,
      color: styles.text.quiet,
    });
    sectionHeader.appendChild(sectionDesc);

    sectionFrame.appendChild(sectionHeader);

    // Preview card mirroring Web Awesome docs example box
    const previewCard = figma.createFrame();
    previewCard.name = 'Preview';
    previewCard.layoutMode = 'VERTICAL';
    previewCard.primaryAxisSizingMode = 'AUTO';
    previewCard.counterAxisSizingMode = 'AUTO';
    previewCard.paddingTop = 24;
    previewCard.paddingBottom = 24;
    previewCard.paddingLeft = 24;
    previewCard.paddingRight = 24;
    previewCard.itemSpacing = specimen.rowGap ?? 12;
    previewCard.cornerRadius = 12;
    previewCard.clipsContent = false;
    previewCard.layoutAlign = 'STRETCH';
    setSolidFill(previewCard, styles.surface.raised);
    setSolidStroke(previewCard, styles.surface.border, 1);

    const colGap = specimen.columnGap ?? 12;
    const rowAlign = specimen.rowAlign ?? 'CENTER';

    specimen.rows.forEach((rowInstances, rowIndex) => {
      const rowFrame = figma.createFrame();
      rowFrame.name = specimen.rows.length > 1 ? `Row ${rowIndex + 1}` : 'Row';
      rowFrame.layoutMode = 'HORIZONTAL';
      rowFrame.primaryAxisSizingMode = 'AUTO';
      rowFrame.counterAxisSizingMode = 'AUTO';
      rowFrame.counterAxisAlignItems = rowAlign;
      rowFrame.itemSpacing = colGap;
      rowFrame.fills = [];
      rowFrame.clipsContent = false;

      for (const instance of rowInstances) {
        rowFrame.appendChild(instance);
      }

      previewCard.appendChild(rowFrame);
    });

    sectionFrame.appendChild(previewCard);
    showcase.appendChild(sectionFrame);
  }

  return showcase;
}

/**
 * Wraps a Web Awesome-style Docs Showcase (built from live instances) and its
 * Master ComponentSet inside a single organized Figma Section.
 */
export function buildComponentDocsSection(
  spec: ComponentDocsSpec,
  componentSet: ComponentSetNode,
  styles: ResolvedWebAwesomeStyles,
  fonts: LoadedFontSet
): SectionNode {
  const sectionPadding = 48;
  const columnGap = 64;

  const section = figma.createSection();
  section.name = spec.sectionName;
  setSolidFill(section, styles.surface.lowered);

  const showcase = buildShowcaseFrame(spec, styles, fonts);
  section.appendChild(showcase);
  showcase.x = sectionPadding;
  showcase.y = sectionPadding;

  // Label above the Master ComponentSet
  const masterHeader = figma.createFrame();
  masterHeader.name = 'Master Component Header';
  masterHeader.layoutMode = 'VERTICAL';
  masterHeader.primaryAxisSizingMode = 'AUTO';
  masterHeader.counterAxisSizingMode = 'AUTO';
  masterHeader.itemSpacing = 4;
  masterHeader.fills = [];
  masterHeader.clipsContent = false;

  const masterTitle = createTextNode({
    name: 'Title',
    characters: 'Master Component Set',
    fontName: fontForWeight(fonts, styles.fontWeight.bold),
    fontSize: 18,
    lineHeightRatio: 1.3,
    color: styles.text.normal,
  });
  masterHeader.appendChild(masterTitle);

  const masterSubtitle = createTextNode({
    name: 'Subtitle',
    characters: `${componentSet.children.length} variants · Grouped to match Web Awesome docs`,
    fontName: fontForWeight(fonts, styles.fontWeight.body),
    fontSize: 13,
    lineHeightRatio: 1.4,
    color: styles.text.quiet,
  });
  masterHeader.appendChild(masterSubtitle);

  section.appendChild(masterHeader);
  const rightColumnX = sectionPadding + showcase.width + columnGap;
  masterHeader.x = rightColumnX;
  masterHeader.y = sectionPadding;

  section.appendChild(componentSet);
  componentSet.x = rightColumnX;
  componentSet.y = sectionPadding + masterHeader.height + 16;

  const totalWidth =
    rightColumnX + Math.max(masterHeader.width, componentSet.width) + sectionPadding;
  const rightColumnHeight = masterHeader.height + 16 + componentSet.height;
  const totalHeight =
    sectionPadding * 2 + Math.max(showcase.height, rightColumnHeight);

  section.resizeWithoutConstraints(totalWidth, totalHeight);

  return section;
}
