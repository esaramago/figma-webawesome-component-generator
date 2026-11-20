import type { ButtonIconOptions, FigmaColor } from '../../shared/types';
import {
  ensureIconComponent,
  getLibraryPreferredIconValues,
  tintIconInstance,
} from './icon-library';
import { applyIconToSlot } from './icon-placeholder';

interface ResolvedButtonTargets {
  /** Main component variants to update (when a ComponentSet, Component, or legacy instance is selected) */
  components: ComponentNode[];
  /** ComponentSets whose default INSTANCE_SWAP values should be updated */
  componentSets: ComponentSetNode[];
  /** ComponentSets owning swappable instances (for syncing preferredValues dropdown options) */
  ownerComponentSets: ComponentSetNode[];
  /** Button instances that support per-instance INSTANCE_SWAP */
  swappableInstances: InstanceNode[];
  /** Legacy button instances (FRAME-based slots) whose main variants are updated */
  legacyInstances: InstanceNode[];
}

function findIconSlot(
  component: ComponentNode,
  slotName: 'Start Icon' | 'End Icon'
): FrameNode | InstanceNode | null {
  return component.findOne(
    (child) =>
      (child.type === 'INSTANCE' || child.type === 'FRAME') &&
      child.name === slotName
  ) as FrameNode | InstanceNode | null;
}

function isButtonComponent(node: ComponentNode): boolean {
  return (
    findIconSlot(node, 'Start Icon') !== null ||
    findIconSlot(node, 'End Icon') !== null
  );
}

function findPropertyKey(
  props: ComponentProperties | ComponentPropertyDefinitions,
  prefix: string,
  expectedType: ComponentPropertyType
): string | null {
  const key = Object.keys(props).find(
    (k) => (k === prefix || k.startsWith(`${prefix}#`)) && props[k]?.type === expectedType
  );
  return key ?? null;
}

function hasIconSwapProperties(instance: InstanceNode): boolean {
  const props = instance.componentProperties;
  return (
    findPropertyKey(props, 'Start Icon', 'INSTANCE_SWAP') !== null ||
    findPropertyKey(props, 'End Icon', 'INSTANCE_SWAP') !== null
  );
}

function extractColorFromPaint(
  paints: readonly Paint[] | typeof figma.mixed
): FigmaColor | null {
  if (paints === figma.mixed || !Array.isArray(paints)) return null;
  const solid = paints.find(
    (paint): paint is SolidPaint =>
      paint.type === 'SOLID' && paint.visible !== false
  );
  if (!solid) return null;
  return {
    r: solid.color.r,
    g: solid.color.g,
    b: solid.color.b,
    a: solid.opacity ?? 1,
  };
}

function resolveSlotColor(
  component: ComponentNode,
  slotNode: FrameNode | InstanceNode
): FigmaColor {
  // Prefer existing icon vector fill/stroke so we keep the exact variant color
  const existingVector = slotNode.findOne(
    (n) => n.type === 'VECTOR' && n.name === 'Icon Vector'
  ) as VectorNode | null;

  if (existingVector) {
    const fillColor = extractColorFromPaint(existingVector.fills);
    if (fillColor) return fillColor;
    const strokeColor = extractColorFromPaint(existingVector.strokes);
    if (strokeColor) return strokeColor;
  }

  // Fallback to Label text fill
  const labelNode = component.findOne(
    (n) => n.type === 'TEXT' && n.name === 'Label'
  ) as TextNode | null;
  if (labelNode) {
    const labelColor = extractColorFromPaint(labelNode.fills);
    if (labelColor) return labelColor;
  }

  return { r: 0.12, g: 0.14, b: 0.16, a: 1 };
}

async function resolveTargets(
  selection: readonly SceneNode[]
): Promise<ResolvedButtonTargets> {
  const componentMap = new Map<string, ComponentNode>();
  const componentSetMap = new Map<string, ComponentSetNode>();
  const ownerSetMap = new Map<string, ComponentSetNode>();
  const swappableInstanceMap = new Map<string, InstanceNode>();
  const legacyInstanceMap = new Map<string, InstanceNode>();

  const addComponent = (comp: ComponentNode) => {
    if (isButtonComponent(comp)) {
      componentMap.set(comp.id, comp);
    }
  };

  const addComponentSet = (set: ComponentSetNode) => {
    let addedAny = false;
    for (const child of set.children) {
      if (child.type === 'COMPONENT' && isButtonComponent(child)) {
        componentMap.set(child.id, child);
        addedAny = true;
      }
    }
    if (addedAny) {
      componentSetMap.set(set.id, set);
      ownerSetMap.set(set.id, set);
    }
  };

  const inspectInstance = async (inst: InstanceNode) => {
    const main = await inst.getMainComponentAsync();
    if (!main || !isButtonComponent(main)) return;

    if (hasIconSwapProperties(inst)) {
      swappableInstanceMap.set(inst.id, inst);
      if (main.parent && main.parent.type === 'COMPONENT_SET') {
        ownerSetMap.set(main.parent.id, main.parent);
      }
      return;
    }

    // Legacy FRAME-based button: update its main component set
    legacyInstanceMap.set(inst.id, inst);
    if (main.parent && main.parent.type === 'COMPONENT_SET') {
      addComponentSet(main.parent);
    } else {
      addComponent(main);
    }
  };

  const inspectNode = async (node: SceneNode) => {
    if (node.type === 'COMPONENT_SET') {
      addComponentSet(node);
      return;
    }

    if (node.type === 'COMPONENT') {
      addComponent(node);
      if (node.parent && node.parent.type === 'COMPONENT_SET') {
        ownerSetMap.set(node.parent.id, node.parent);
      }
      return;
    }

    if (node.type === 'INSTANCE') {
      await inspectInstance(node);
      return;
    }

    if (node.type === 'SECTION' || node.type === 'FRAME' || node.type === 'GROUP') {
      const sets = node.findAll(
        (n) => n.type === 'COMPONENT_SET' && n.name.includes('Button')
      ) as ComponentSetNode[];
      for (const set of sets) {
        addComponentSet(set);
      }

      if (sets.length === 0) {
        const instances = node.findAll(
          (n) => n.type === 'INSTANCE'
        ) as InstanceNode[];
        for (const inst of instances) {
          await inspectInstance(inst);
        }
      }
    }
  };

  for (const node of selection) {
    await inspectNode(node);
  }

  return {
    components: Array.from(componentMap.values()),
    componentSets: Array.from(componentSetMap.values()),
    ownerComponentSets: Array.from(ownerSetMap.values()),
    swappableInstances: Array.from(swappableInstanceMap.values()),
    legacyInstances: Array.from(legacyInstanceMap.values()),
  };
}

export async function inspectButtonSelection(
  selection: readonly SceneNode[]
): Promise<{ targetCount: number; description: string }> {
  if (selection.length === 0) {
    return {
      targetCount: 0,
      description: 'Select a Button component or instance on canvas',
    };
  }

  const { components, swappableInstances, legacyInstances } =
    await resolveTargets(selection);

  const totalTargets = components.length + swappableInstances.length;
  if (totalTargets === 0) {
    return {
      targetCount: 0,
      description: 'No Button component or instance in selection',
    };
  }

  if (swappableInstances.length > 0 && components.length === 0) {
    return {
      targetCount: swappableInstances.length,
      description: `${swappableInstances.length} button instance${swappableInstances.length === 1 ? '' : 's'} selected (swaps instance)`,
    };
  }

  if (swappableInstances.length > 0 && components.length > 0) {
    return {
      targetCount: totalTargets,
      description: `${swappableInstances.length} instance${swappableInstances.length === 1 ? '' : 's'} + ${components.length} variant${components.length === 1 ? '' : 's'} targeted`,
    };
  }

  if (legacyInstances.length > 0) {
    return {
      targetCount: components.length,
      description: `${legacyInstances.length} button instance${legacyInstances.length === 1 ? '' : 's'} selected (${components.length} variants)`,
    };
  }

  return {
    targetCount: components.length,
    description: `${components.length} button variant${components.length === 1 ? '' : 's'} targeted (updates defaults)`,
  };
}

function enableInstanceIconProperty(
  instance: InstanceNode,
  prefix: 'Show Start Icon' | 'Show End Icon'
): void {
  const key = findPropertyKey(instance.componentProperties, prefix, 'BOOLEAN');
  if (key) {
    instance.setProperties({ [key]: true });
  }
}

function syncComponentSetIconProperties(
  componentSet: ComponentSetNode,
  preferredValues: InstanceSwapPreferredValue[],
  defaultStartIconId?: string,
  defaultEndIconId?: string
): void {
  const defs = componentSet.componentPropertyDefinitions;
  const startKey = findPropertyKey(defs, 'Start Icon', 'INSTANCE_SWAP');
  const endKey = findPropertyKey(defs, 'End Icon', 'INSTANCE_SWAP');

  if (startKey) {
    componentSet.editComponentProperty(startKey, {
      ...(defaultStartIconId ? { defaultValue: defaultStartIconId } : {}),
      ...(preferredValues.length > 0 ? { preferredValues } : {}),
    });
  }

  if (endKey) {
    componentSet.editComponentProperty(endKey, {
      ...(defaultEndIconId ? { defaultValue: defaultEndIconId } : {}),
      ...(preferredValues.length > 0 ? { preferredValues } : {}),
    });
  }
}

function applyIconToVariantSlot(
  component: ComponentNode,
  slotName: 'Start Icon' | 'End Icon',
  iconComponent: ComponentNode | null,
  svgMarkup?: string
): void {
  const slot = findIconSlot(component, slotName);
  if (!slot) return;

  const color = resolveSlotColor(component, slot);

  if (slot.type === 'INSTANCE' && iconComponent) {
    slot.swapComponent(iconComponent);
    tintIconInstance(slot, color);
    return;
  }

  if (slot.type === 'FRAME' && svgMarkup) {
    const size = Math.max(8, Math.round(slot.width || 16));
    applyIconToSlot(slot, size, color, svgMarkup);
  }
}

export async function updateSelectedButtonIcons(
  selection: readonly SceneNode[],
  icons: ButtonIconOptions
): Promise<{ variantCount: number; instanceCount: number }> {
  const {
    components,
    componentSets,
    ownerComponentSets,
    swappableInstances,
    legacyInstances,
  } = await resolveTargets(selection);

  if (components.length === 0 && swappableInstances.length === 0) {
    throw new Error(
      'Select a Button component, variant, or instance on the canvas first.'
    );
  }

  if (!icons.startIconSvg && !icons.endIconSvg) {
    throw new Error('Enter at least one FontAwesome icon name to apply.');
  }

  const needsIconComponents =
    swappableInstances.length > 0 ||
    componentSets.length > 0 ||
    components.some(
      (comp) =>
        findIconSlot(comp, 'Start Icon')?.type === 'INSTANCE' ||
        findIconSlot(comp, 'End Icon')?.type === 'INSTANCE'
    );

  const startIconComponent =
    needsIconComponents && icons.startIconSvg
      ? ensureIconComponent(icons.startIconName ?? 'plus', icons.startIconSvg)
      : null;

  const endIconComponent =
    needsIconComponents && icons.endIconSvg
      ? ensureIconComponent(
          icons.endIconName ?? 'arrow-right',
          icons.endIconSvg
        )
      : null;

  // Keep preferredValues up-to-date on all related Button ComponentSets
  if (needsIconComponents) {
    const preferredValues = getLibraryPreferredIconValues();
    const targetedSetIds = new Set(componentSets.map((s) => s.id));

    for (const set of ownerComponentSets) {
      const isTargeted = targetedSetIds.has(set.id);
      syncComponentSetIconProperties(
        set,
        preferredValues,
        isTargeted ? startIconComponent?.id : undefined,
        isTargeted ? endIconComponent?.id : undefined
      );
    }
  }

  // Swap per-instance on modern INSTANCE_SWAP buttons without touching other instances
  for (const instance of swappableInstances) {
    const updates: Record<string, string | boolean> = {};
    const props = instance.componentProperties;

    if (startIconComponent) {
      const startSwapKey = findPropertyKey(props, 'Start Icon', 'INSTANCE_SWAP');
      const startShowKey = findPropertyKey(props, 'Show Start Icon', 'BOOLEAN');
      if (startSwapKey) updates[startSwapKey] = startIconComponent.id;
      if (startShowKey) updates[startShowKey] = true;
    }

    if (endIconComponent) {
      const endSwapKey = findPropertyKey(props, 'End Icon', 'INSTANCE_SWAP');
      const endShowKey = findPropertyKey(props, 'Show End Icon', 'BOOLEAN');
      if (endSwapKey) updates[endSwapKey] = endIconComponent.id;
      if (endShowKey) updates[endShowKey] = true;
    }

    if (Object.keys(updates).length > 0) {
      instance.setProperties(updates);
    }
  }

  // Update main variants (when ComponentSet, Component, or legacy instance was selected)
  for (const component of components) {
    if (icons.startIconSvg) {
      applyIconToVariantSlot(
        component,
        'Start Icon',
        startIconComponent,
        icons.startIconSvg
      );
    }

    if (icons.endIconSvg) {
      applyIconToVariantSlot(
        component,
        'End Icon',
        endIconComponent,
        icons.endIconSvg
      );
    }
  }

  for (const instance of legacyInstances) {
    if (icons.startIconSvg) {
      enableInstanceIconProperty(instance, 'Show Start Icon');
    }
    if (icons.endIconSvg) {
      enableInstanceIconProperty(instance, 'Show End Icon');
    }
  }

  return {
    variantCount: components.length,
    instanceCount: swappableInstances.length + legacyInstances.length,
  };
}
