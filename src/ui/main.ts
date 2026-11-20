import {
  COMPONENT_CATALOG,
  type ButtonIconOptions,
  type ComponentId,
  type PluginToUiMessage,
  type UiToPluginMessage,
} from '../shared/types'
import { resolveWebAwesomeStyles } from '../styles/resolver'
import {
  fetchFontAwesomeSvg,
  type FontAwesomeStyle,
} from './fontawesome'

const listEl = document.getElementById('component-list') as HTMLElement
const toggleAllBtn = document.getElementById(
  'toggle-all-btn',
) as HTMLButtonElement
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement
const footerHintEl = document.getElementById('footer-hint') as HTMLElement
const statusBoxEl = document.getElementById('status-box') as HTMLElement
const statusTextEl = document.getElementById('status-text') as HTMLElement
const progressTrackEl = document.getElementById('progress-track') as HTMLElement
const progressBarEl = document.getElementById('progress-bar') as HTMLElement
const fontFamilySelect = document.getElementById(
  'font-family-select',
) as HTMLSelectElement
const faStyleSelect = document.getElementById('fa-style-select') as HTMLSelectElement
const startIconInput = document.getElementById('start-icon-input') as HTMLInputElement
const endIconInput = document.getElementById('end-icon-input') as HTMLInputElement
const startIconPreview = document.getElementById('start-icon-preview') as HTMLElement
const endIconPreview = document.getElementById('end-icon-preview') as HTMLElement
const selectionHintEl = document.getElementById('selection-hint') as HTMLElement
const applyIconsBtn = document.getElementById('apply-icons-btn') as HTMLButtonElement
const buttonPillToggle = document.getElementById(
  'button-pill-toggle',
) as HTMLInputElement

const selected = new Set<ComponentId>(COMPONENT_CATALOG.map((item) => item.id))
let isGenerating = false
let isBusy = false
let selectionTargetCount = 0

function postToPlugin(message: UiToPluginMessage): void {
  parent.postMessage({ pluginMessage: message }, '*')
}

function showStatus(
  text: string,
  kind: 'info' | 'success' | 'error',
  progressPercent?: number,
): void {
  statusBoxEl.className = 'status-box is-visible'
  if (kind === 'success') statusBoxEl.classList.add('is-success')
  if (kind === 'error') statusBoxEl.classList.add('is-error')
  statusTextEl.textContent = text

  if (typeof progressPercent === 'number') {
    progressTrackEl.hidden = false
    progressBarEl.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`
  } else {
    progressTrackEl.hidden = true
  }
}

function hideStatus(): void {
  statusBoxEl.className = 'status-box'
  progressTrackEl.hidden = true
}

function updateControls(): void {
  const count = selected.size
  const totalVariants = COMPONENT_CATALOG.filter((item) =>
    selected.has(item.id),
  ).reduce((sum, item) => sum + item.variantCount, 0)

  const allSelected = count === COMPONENT_CATALOG.length
  toggleAllBtn.textContent = allSelected ? 'Deselect all' : 'Select all'
  toggleAllBtn.disabled = isGenerating || isBusy

  generateBtn.disabled = isGenerating || isBusy || count === 0
  generateBtn.textContent = isGenerating
    ? 'Generating...'
    : count === 0
      ? 'Select at least 1 component'
      : `Generate ${count} Component${count === 1 ? '' : 's'}`

  const hasAnyIconName =
    startIconInput.value.trim().length > 0 ||
    endIconInput.value.trim().length > 0
  applyIconsBtn.disabled =
    isGenerating || isBusy || selectionTargetCount === 0 || !hasAnyIconName

  startIconInput.disabled = isGenerating || isBusy
  endIconInput.disabled = isGenerating || isBusy
  fontFamilySelect.disabled = isGenerating || isBusy
  faStyleSelect.disabled = isGenerating || isBusy
  buttonPillToggle.disabled = isGenerating || isBusy

  footerHintEl.textContent =
    count > 0
      ? `${totalVariants} total variants · placed neatly on the current page`
      : 'Choose one or more components above'

  listEl
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((cb) => {
      cb.disabled = isGenerating
      const card = cb.closest('.component-card')
      if (card) {
        card.classList.toggle('is-selected', cb.checked)
      }
    })
}

function renderList(): void {
  listEl.innerHTML = ''

  for (const item of COMPONENT_CATALOG) {
    const label = document.createElement('label')
    label.className = `component-card${selected.has(item.id) ? ' is-selected' : ''}`

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = selected.has(item.id)
    checkbox.value = item.id
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selected.add(item.id)
      } else {
        selected.delete(item.id)
      }
      hideStatus()
      updateControls()
    })

    const meta = document.createElement('div')
    meta.className = 'component-meta'

    const row = document.createElement('div')
    row.className = 'component-row'

    const nameSpan = document.createElement('span')
    nameSpan.className = 'component-name'
    nameSpan.textContent = item.label

    const tagSpan = document.createElement('span')
    tagSpan.className = 'component-tag'
    tagSpan.textContent = item.tag

    row.appendChild(nameSpan)
    row.appendChild(tagSpan)

    const desc = document.createElement('span')
    desc.className = 'component-desc'
    desc.textContent = item.description

    meta.appendChild(row)
    meta.appendChild(desc)

    label.appendChild(checkbox)
    label.appendChild(meta)
    listEl.appendChild(label)
  }

  updateControls()
}

toggleAllBtn.addEventListener('click', () => {
  if (selected.size === COMPONENT_CATALOG.length) {
    selected.clear()
  } else {
    COMPONENT_CATALOG.forEach((item) => selected.add(item.id))
  }
  hideStatus()
  renderList()
})

function getSelectedFaStyle(): FontAwesomeStyle {
  return (faStyleSelect.value as FontAwesomeStyle) || 'auto'
}

function setPreviewState(
  previewEl: HTMLElement,
  inputEl: HTMLInputElement,
  state: 'empty' | 'loading' | 'error' | 'ready',
  svgOrTitle?: string
): void {
  const wrap = inputEl.closest('.icon-input-wrap')
  previewEl.className = 'icon-preview'
  wrap?.classList.remove('is-error')

  if (state === 'empty') {
    previewEl.innerHTML = ''
    previewEl.title = ''
    return
  }

  if (state === 'loading') {
    previewEl.classList.add('is-loading')
    previewEl.textContent = '…'
    previewEl.title = 'Loading icon...'
    return
  }

  if (state === 'error') {
    previewEl.classList.add('is-error')
    wrap?.classList.add('is-error')
    previewEl.textContent = '!'
    previewEl.title = svgOrTitle ?? 'Icon not found'
    return
  }

  previewEl.innerHTML = svgOrTitle ?? ''
  previewEl.title = ''
}

let previewTimer: number | undefined

async function refreshSinglePreview(
  inputEl: HTMLInputElement,
  previewEl: HTMLElement
): Promise<void> {
  const raw = inputEl.value.trim()
  if (!raw) {
    setPreviewState(previewEl, inputEl, 'empty')
    return
  }

  setPreviewState(previewEl, inputEl, 'loading')
  try {
    const result = await fetchFontAwesomeSvg(raw, getSelectedFaStyle())
    // Ignore stale result if input changed while fetching
    if (inputEl.value.trim() !== raw) return
    setPreviewState(previewEl, inputEl, 'ready', result.svg)
  } catch (err) {
    if (inputEl.value.trim() !== raw) return
    const message = err instanceof Error ? err.message : 'Icon not found'
    setPreviewState(previewEl, inputEl, 'error', message)
  }
}

function schedulePreviewRefresh(): void {
  updateControls()
  window.clearTimeout(previewTimer)
  previewTimer = window.setTimeout(() => {
    void refreshSinglePreview(startIconInput, startIconPreview)
    void refreshSinglePreview(endIconInput, endIconPreview)
  }, 280)
}

async function resolveButtonIconsFromInputs(): Promise<ButtonIconOptions> {
  const style = getSelectedFaStyle()
  const startRaw = startIconInput.value.trim()
  const endRaw = endIconInput.value.trim()

  const [startRes, endRes] = await Promise.all([
    startRaw
      ? fetchFontAwesomeSvg(startRaw, style)
      : Promise.resolve(undefined),
    endRaw ? fetchFontAwesomeSvg(endRaw, style) : Promise.resolve(undefined),
  ])

  if (startRes) {
    setPreviewState(startIconPreview, startIconInput, 'ready', startRes.svg)
  }
  if (endRes) {
    setPreviewState(endIconPreview, endIconInput, 'ready', endRes.svg)
  }

  return {
    startIconName: startRes?.name,
    startIconSvg: startRes?.svg,
    endIconName: endRes?.name,
    endIconSvg: endRes?.svg,
  }
}

startIconInput.addEventListener('input', schedulePreviewRefresh)
endIconInput.addEventListener('input', schedulePreviewRefresh)
faStyleSelect.addEventListener('change', () => {
  void refreshSinglePreview(startIconInput, startIconPreview)
  void refreshSinglePreview(endIconInput, endIconPreview)
})

applyIconsBtn.addEventListener('click', async () => {
  if (isGenerating || isBusy || selectionTargetCount === 0) return

  isBusy = true
  updateControls()
  showStatus('Fetching FontAwesome icon(s) from jsDelivr...', 'info')

  try {
    const icons = await resolveButtonIconsFromInputs()
    if (!icons.startIconSvg && !icons.endIconSvg) {
      throw new Error('Enter at least one FontAwesome icon name to apply.')
    }
    postToPlugin({
      type: 'update-button-icons',
      icons,
    })
  } catch (err) {
    isBusy = false
    updateControls()
    const message =
      err instanceof Error ? err.message : 'Failed to fetch FontAwesome icon.'
    showStatus(message, 'error')
  }
})

generateBtn.addEventListener('click', async () => {
  if (isGenerating || isBusy || selected.size === 0) return

  isGenerating = true
  updateControls()
  showStatus('Resolving styles & FontAwesome icons...', 'info', 8)

  try {
    const buttonIcons = selected.has('button')
      ? await resolveButtonIconsFromInputs()
      : undefined
    const styles = resolveWebAwesomeStyles()
    const orderedSelection = COMPONENT_CATALOG.map((c) => c.id).filter((id) =>
      selected.has(id),
    )

    postToPlugin({
      type: 'generate',
      components: orderedSelection,
      styles,
      fontFamily: fontFamilySelect.value || undefined,
      buttonIcons,
      buttonPill: selected.has('button') ? buttonPillToggle.checked : undefined,
    })
  } catch (err) {
    isGenerating = false
    updateControls()
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to resolve Web Awesome CSS styles.'
    showStatus(message, 'error')
  }
})

window.onmessage = (
  event: MessageEvent<{ pluginMessage?: PluginToUiMessage }>,
) => {
  const msg = event.data?.pluginMessage
  if (!msg) return

  if (msg.type === 'progress') {
    const percent = Math.round(((msg.current - 0.5) / msg.total) * 100)
    showStatus(
      `Generating ${msg.label} (${msg.current}/${msg.total})...`,
      'info',
      percent,
    )
    return
  }

  if (msg.type === 'complete') {
    isGenerating = false
    updateControls()
    const totalVariants = msg.generated.reduce(
      (sum, g) => sum + g.variantCount,
      0,
    )
    const names = msg.generated.map((g) => g.name.split(' ')[0]).join(', ')
    showStatus(
      `Done! Generated ${names} (${totalVariants} variants) on the current page.`,
      'success',
    )
    return
  }

  if (msg.type === 'fonts-loaded') {
    const previous = fontFamilySelect.value
    fontFamilySelect.innerHTML = ''
    for (const family of msg.families) {
      const option = document.createElement('option')
      option.value = family
      option.textContent = family
      fontFamilySelect.appendChild(option)
    }
    if (previous && msg.families.includes(previous)) {
      fontFamilySelect.value = previous
    } else if (msg.families.includes(msg.defaultFamily)) {
      fontFamilySelect.value = msg.defaultFamily
    }
    return
  }

  if (msg.type === 'selection-changed') {
    selectionTargetCount = msg.targetCount
    selectionHintEl.textContent = msg.description
    updateControls()
    return
  }

  if (msg.type === 'icons-updated') {
    isBusy = false
    updateControls()
    const statusMessage =
      msg.variantCount === 0 && msg.instanceCount > 0
        ? `Swapped icons on ${msg.instanceCount} button instance${msg.instanceCount === 1 ? '' : 's'}.`
        : `Updated icons on ${msg.variantCount} button variant${msg.variantCount === 1 ? '' : 's'}${
            msg.instanceCount > 0
              ? ` and ${msg.instanceCount} instance${msg.instanceCount === 1 ? '' : 's'}`
              : ''
          }.`
    showStatus(statusMessage, 'success')
    return
  }

  if (msg.type === 'error') {
    isGenerating = false
    isBusy = false
    updateControls()
    showStatus(msg.message, 'error')
  }
}

renderList()
void refreshSinglePreview(startIconInput, startIconPreview)
void refreshSinglePreview(endIconInput, endIconPreview)
