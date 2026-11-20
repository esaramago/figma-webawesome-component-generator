import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/badge/badge.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';

import {
  BADGE_APPEARANCES,
  BUTTON_APPEARANCES,
  COMPONENT_SIZES,
  INPUT_APPEARANCES,
  SEMANTIC_VARIANTS,
  type ComponentSize,
} from '../shared/types';
import {
  fetchFontAwesomeSvg,
  type FontAwesomeStyle,
} from '../ui/fontawesome';

const WA_SIZE_MAP: Record<ComponentSize, 'small' | 'medium' | 'large'> = {
  s: 'small',
  m: 'medium',
  l: 'large',
};

const SAMPLE_ICONS = [
  'plus',
  'arrow-right',
  'arrow-left',
  'check',
  'xmark',
  'chevron-down',
  'magnifying-glass',
  'gear',
  'user',
  'bell',
  'star',
  'heart',
  'trash',
  'pen',
  'download',
  'upload',
  'circle-info',
  'triangle-exclamation',
  'circle-check',
  'circle-xmark',
];

const buttonShowcase = document.getElementById('button-showcase') as HTMLElement;
const badgeShowcase = document.getElementById('badge-showcase') as HTMLElement;
const inputShowcase = document.getElementById('input-showcase') as HTMLElement;
const iconGallery = document.getElementById('icon-gallery') as HTMLElement;

const faStyleSelect = document.getElementById('fa-style-select') as HTMLSelectElement;
const startIconInput = document.getElementById('start-icon-input') as HTMLInputElement;
const endIconInput = document.getElementById('end-icon-input') as HTMLInputElement;
const showIconsToggle = document.getElementById('show-icons-toggle') as HTMLInputElement;

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function createSlotSpan(slot: 'start' | 'end', svgMarkup: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.slot = slot;
  span.className = 'btn-slot-icon';
  span.innerHTML = svgMarkup;
  return span;
}

function renderButtons(startSvg: string | null, endSvg: string | null): void {
  buttonShowcase.innerHTML = '';
  const showIcons = showIconsToggle.checked;

  for (const appearance of BUTTON_APPEARANCES) {
    const group = document.createElement('div');
    group.className = 'group-card';

    const heading = document.createElement('h3');
    heading.className = 'group-title';
    heading.textContent = `Appearance: ${titleCase(appearance)}`;
    group.appendChild(heading);

    for (const size of COMPONENT_SIZES) {
      for (const disabled of [false, true]) {
        const row = document.createElement('div');
        row.className = 'matrix-row';

        const label = document.createElement('span');
        label.className = 'row-label';
        label.textContent = `${WA_SIZE_MAP[size]} · ${disabled ? 'disabled' : 'default'}`;
        row.appendChild(label);

        for (const variant of SEMANTIC_VARIANTS) {
          const btn = document.createElement('wa-button');
          btn.setAttribute('variant', variant);
          btn.setAttribute('appearance', appearance);
          btn.setAttribute('size', WA_SIZE_MAP[size]);
          if (disabled) {
            btn.setAttribute('disabled', '');
          }

          if (showIcons && startSvg) {
            btn.appendChild(createSlotSpan('start', startSvg));
          }
          btn.appendChild(document.createTextNode(titleCase(variant)));
          if (showIcons && endSvg) {
            btn.appendChild(createSlotSpan('end', endSvg));
          }

          row.appendChild(btn);
        }

        group.appendChild(row);
      }
    }

    buttonShowcase.appendChild(group);
  }
}

function renderBadges(): void {
  badgeShowcase.innerHTML = '';

  for (const appearance of BADGE_APPEARANCES) {
    const group = document.createElement('div');
    group.className = 'group-card';

    const heading = document.createElement('h3');
    heading.className = 'group-title';
    heading.textContent = `Appearance: ${titleCase(appearance)}`;
    group.appendChild(heading);

    for (const pill of [false, true]) {
      const row = document.createElement('div');
      row.className = 'matrix-row';

      const label = document.createElement('span');
      label.className = 'row-label';
      label.textContent = pill ? 'pill' : 'rounded';
      row.appendChild(label);

      for (const variant of SEMANTIC_VARIANTS) {
        const badge = document.createElement('wa-badge');
        badge.setAttribute('variant', variant);
        badge.setAttribute('appearance', appearance);
        if (pill) {
          badge.setAttribute('pill', '');
        }
        badge.textContent = titleCase(variant);
        row.appendChild(badge);
      }

      group.appendChild(row);
    }

    badgeShowcase.appendChild(group);
  }
}

function renderInputs(): void {
  inputShowcase.innerHTML = '';

  for (const appearance of INPUT_APPEARANCES) {
    const group = document.createElement('div');
    group.className = 'group-card';

    const heading = document.createElement('h3');
    heading.className = 'group-title';
    heading.textContent = `Appearance: ${titleCase(appearance)}`;
    group.appendChild(heading);

    for (const disabled of [false, true]) {
      const grid = document.createElement('div');
      grid.className = 'input-grid';

      for (const size of COMPONENT_SIZES) {
        const input = document.createElement('wa-input');
        input.setAttribute('appearance', appearance);
        input.setAttribute('size', WA_SIZE_MAP[size]);
        input.setAttribute('label', `Label (${WA_SIZE_MAP[size]} · ${disabled ? 'disabled' : 'default'})`);
        input.setAttribute('placeholder', 'Placeholder text...');
        input.setAttribute('hint', 'Helper hint text');
        if (disabled) {
          input.setAttribute('disabled', '');
        }
        grid.appendChild(input);
      }

      group.appendChild(grid);
    }

    inputShowcase.appendChild(group);
  }
}

async function tryFetchIcon(
  name: string,
  style: FontAwesomeStyle
) {
  try {
    return await fetchFontAwesomeSvg(name, style);
  } catch {
    return null;
  }
}

async function renderIconGallery(style: FontAwesomeStyle): Promise<void> {
  iconGallery.innerHTML = '';
  const extraNames = [startIconInput.value.trim(), endIconInput.value.trim()].filter(Boolean);
  const names = Array.from(new Set([...extraNames, ...SAMPLE_ICONS]));

  const results = await Promise.all(
    names.map(async (name) => ({
      name,
      resolved: await tryFetchIcon(name, style),
    }))
  );

  for (const { name, resolved } of results) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'icon-tile';
    tile.title = `Click to set as Start icon (${name})`;
    tile.addEventListener('click', () => {
      startIconInput.value = name;
      void refreshIcons();
    });

    const svgBox = document.createElement('span');
    svgBox.className = 'icon-tile-svg';
    svgBox.innerHTML = resolved ? resolved.svg : '—';

    const nameEl = document.createElement('span');
    nameEl.className = 'icon-tile-name';
    nameEl.textContent = resolved ? `${resolved.name} (${resolved.style})` : `${name} (not found)`;

    tile.appendChild(svgBox);
    tile.appendChild(nameEl);
    iconGallery.appendChild(tile);
  }
}

async function refreshIcons(): Promise<void> {
  const style = faStyleSelect.value as FontAwesomeStyle;
  const [startRes, endRes] = await Promise.all([
    tryFetchIcon(startIconInput.value, style),
    tryFetchIcon(endIconInput.value, style),
  ]);

  renderButtons(startRes?.svg ?? null, endRes?.svg ?? null);
  await renderIconGallery(style);
}

let debounceTimer: number | undefined;
function scheduleRefresh(): void {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void refreshIcons();
  }, 200);
}

faStyleSelect.addEventListener('change', () => void refreshIcons());
startIconInput.addEventListener('input', scheduleRefresh);
endIconInput.addEventListener('input', scheduleRefresh);
showIconsToggle.addEventListener('change', () => void refreshIcons());

renderBadges();
renderInputs();
void refreshIcons();
