import type {
  PluginToUiMessage,
  UiToPluginMessage,
} from '../shared/types';
import { COMPONENT_GENERATORS } from './generators/registry';
import {
  inspectButtonSelection,
  updateSelectedButtonIcons,
} from './utils/button-icons';
import { placeNodesOnCanvas } from './utils/canvas-layout';
import {
  getAvailableFontFamilies,
  loadPluginFonts,
} from './utils/figma-helpers';

figma.showUI(__html__, {
  width: 360,
  height: 620,
  themeColors: true,
});

function postToUi(message: PluginToUiMessage): void {
  figma.ui.postMessage(message);
}

function yieldFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

async function notifySelectionStatus(): Promise<void> {
  try {
    const info = await inspectButtonSelection(figma.currentPage.selection);
    postToUi({
      type: 'selection-changed',
      targetCount: info.targetCount,
      description: info.description,
    });
  } catch {
    postToUi({
      type: 'selection-changed',
      targetCount: 0,
      description: 'Select a Button component or instance on canvas',
    });
  }
}

async function notifyAvailableFonts(): Promise<void> {
  try {
    const { families, defaultFamily } = await getAvailableFontFamilies();
    postToUi({
      type: 'fonts-loaded',
      families,
      defaultFamily,
    });
  } catch {
    postToUi({
      type: 'fonts-loaded',
      families: ['Montserrat'],
      defaultFamily: 'Montserrat',
    });
  }
}

figma.on('selectionchange', () => {
  void notifySelectionStatus();
});
void notifySelectionStatus();
void notifyAvailableFonts();

figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'update-button-icons') {
    try {
      const result = await updateSelectedButtonIcons(
        figma.currentPage.selection,
        msg.icons
      );
      const notifyMessage =
        result.variantCount === 0 && result.instanceCount > 0
          ? `Swapped icons on ${result.instanceCount} button instance${result.instanceCount === 1 ? '' : 's'}.`
          : `Updated icons on ${result.variantCount} button variant${result.variantCount === 1 ? '' : 's'}.`;
      figma.notify(notifyMessage);
      postToUi({
        type: 'icons-updated',
        variantCount: result.variantCount,
        instanceCount: result.instanceCount,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update selected button icons.';
      figma.notify(`Error: ${message}`, { error: true });
      postToUi({ type: 'error', message });
    }
    return;
  }

  if (msg.type !== 'generate') return;

  const selectedIds = msg.components.filter((id) => id in COMPONENT_GENERATORS);
  if (selectedIds.length === 0) {
    postToUi({
      type: 'error',
      message: 'Select at least one component to generate.',
    });
    return;
  }

  try {
    const fonts = await loadPluginFonts(msg.fontFamily);
    const generatedNodes: SceneNode[] = [];
    const summary: Array<{
      id: (typeof selectedIds)[number];
      name: string;
      variantCount: number;
    }> = [];

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const generator = COMPONENT_GENERATORS[id];

      postToUi({
        type: 'progress',
        current: i + 1,
        total: selectedIds.length,
        componentId: id,
        label: generator.label,
      });

      // Let the UI paint progress before heavy synchronous Figma node creation
      await yieldFrame();

      const { rootNode, componentSet } = generator.generate(
        msg.styles,
        fonts,
        { buttonIcons: msg.buttonIcons, buttonPill: msg.buttonPill }
      );
      generatedNodes.push(rootNode);
      summary.push({
        id,
        name: componentSet.name,
        variantCount: componentSet.children.length,
      });
    }

    placeNodesOnCanvas(generatedNodes);

    const totalVariants = summary.reduce((sum, item) => sum + item.variantCount, 0);
    figma.notify(
      `Generated ${summary.length} Web Awesome component set${summary.length === 1 ? '' : 's'} (${totalVariants} variants).`
    );

    postToUi({
      type: 'complete',
      generated: summary,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error while generating components.';
    figma.notify(`Error: ${message}`, { error: true });
    postToUi({ type: 'error', message });
  }
};
