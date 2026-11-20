# Project Brief: Web Awesome Figma Component Generator

## Goal

Create a **Figma Plugin** that automatically generates **Web Awesome** components directly on the Figma canvas, properly structured with Auto Layout, variants, and component properties, styled accurately using Web Awesome's original CSS styles and variables (`--wa-*`).

## Context

* **Web Awesome is already installed** in this project via `pnpm` (`@awesome.me/webawesome`). The plugin should use the installed package as the single source of truth for component variants, properties, and default visual values.
* **No pre-existing Figma Variables required:** For now, the plugin should resolve the original Web Awesome CSS values directly (colors, spacing, typography, border radius, etc.) so components can be generated out-of-the-box in any blank Figma file. Tokens/Variables will be handled/exported later.
* **Use `pnpm`** as the package manager for the project.

## What the Plugin Should Do

1. **Resolve Styles from Web Awesome:**
   * Extract the visual styles (colors, padding, font sizes, borders, radii) directly from the installed Web Awesome package's original CSS variables (`--wa-*`) and component styles so the generated Figma components look faithful to the real library.

2. **Simple, Practical UI:**
   * Allow the user to select which components they want to generate.
   * Provide a clear button to generate the selected components on the current page.
   * Show clear progress and completion feedback.

3. **Generate Clean, Ready-to-Use Figma Components:**
   * Components must use proper **Auto Layout** and clean, semantic layer naming.
   * Group component states and styles into **Figma Variant Sets** (`ComponentSet`) with appropriate **Component Properties** (such as editable text labels and optional icon slots).
   * Arrange generated component sets neatly on the canvas so they don't overlap.

## Initial Scope (MVP)

Start with a clean, extensible architecture that makes it easy to add more components later, delivering these **3 components** first:

1. **Button (`wa-button`)** — Variants for semantic colors (`variant`), visual styles (`appearance`), sizes (`size`), and states (`default`, `disabled`), plus editable text and optional start/end icon slots.
2. **Badge (`wa-badge`)** — Variants for semantic colors (`variant`), visual styles (`appearance`), and `pill` shape.
3. **Input (`wa-input`)** — Variants for `size`, `appearance`, and `state`, including optional label, placeholder text, and hint text.

## Deliverable

* A working Figma plugin built with TypeScript and `pnpm`, ready to be imported locally into Figma Desktop (*Plugins > Development > Import plugin from manifest...*), along with brief instructions on how to build and run it.

---

## Build & Run

### 1. Install dependencies & build

```bash
pnpm install
pnpm build
```

For development watch mode (auto-rebuilds when files in `src/` change, including `src/css/webawesome-theme.css`):

```bash
pnpm dev
```

To type-check without emitting:

```bash
pnpm typecheck
```

### 2. Import into Figma Desktop

1. Open **Figma Desktop** and open any blank Figma Design file.
2. Go to **Plugins → Development → Import plugin from manifest…**.
3. Select the `manifest.json` file at the root of this repository.
4. Run **Plugins → Development → Web Awesome Component Generator**.
5. Choose the components you want to generate (`Button`, `Badge`, `Input`) and click **Generate**.

### 3. Customizing Theme Variables

Add any `--wa-*` CSS custom property overrides to `src/css/webawesome-theme.css` (loaded on top of `@awesome.me/webawesome`'s Light theme), then run `pnpm build` (or keep `pnpm dev` running) and re-run the plugin in Figma.
