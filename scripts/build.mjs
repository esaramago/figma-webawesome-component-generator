import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const isWatch = process.argv.includes('--watch');

async function buildHtmlBundle({ entryTs, entryCss, templateHtml, outFile }) {
  const [jsResult, cssResult, htmlTemplate] = await Promise.all([
    esbuild.build({
      entryPoints: [path.join(rootDir, entryTs)],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      write: false,
      minify: !isWatch,
    }),
    esbuild.build({
      entryPoints: [path.join(rootDir, entryCss)],
      bundle: true,
      write: false,
      minify: !isWatch,
    }),
    fs.readFile(path.join(rootDir, templateHtml), 'utf8'),
  ]);

  const jsCode = jsResult.outputFiles[0].text;
  const cssCode = cssResult.outputFiles[0].text;

  // Escape closing tags safely when embedding inline into HTML
  const safeCss = cssCode.replace(/<\/style>/gi, '<\\/style>');
  const safeJs = jsCode.replace(/<\/script>/gi, '<\\/script>');

  const html = htmlTemplate
    .replace('<!-- INLINE_STYLES -->', () => `<style>\n${safeCss}\n</style>`)
    .replace('<!-- INLINE_SCRIPT -->', () => `<script>\n${safeJs}\n</script>`);

  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(path.join(distDir, outFile), html, 'utf8');
}

async function buildUiHtml() {
  await buildHtmlBundle({
    entryTs: 'src/ui/main.ts',
    entryCss: 'src/ui/styles.css',
    templateHtml: 'src/ui/index.html',
    outFile: 'ui.html',
  });
}

async function buildPreviewHtml() {
  await buildHtmlBundle({
    entryTs: 'src/preview/main.ts',
    entryCss: 'src/preview/styles.css',
    templateHtml: 'src/preview/index.html',
    outFile: 'preview.html',
  });
}

async function buildPluginCode() {
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/plugin/code.ts')],
    bundle: true,
    format: 'iife',
    target: 'es2017',
    outfile: path.join(distDir, 'code.js'),
    minify: !isWatch,
  });
}

async function buildDistManifest() {
  const raw = await fs.readFile(path.join(rootDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(raw);
  manifest.main = 'code.js';
  manifest.ui = 'ui.html';
  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
}

async function buildAll() {
  const start = Date.now();
  await Promise.all([
    buildPluginCode(),
    buildUiHtml(),
    buildPreviewHtml(),
    buildDistManifest(),
  ]);
  console.log(`[build] Built dist/code.js, dist/ui.html, dist/preview.html & dist/manifest.json in ${Date.now() - start}ms`);
}

if (isWatch) {
  await buildAll();
  console.log('[build] Watching src/ for changes...');
  const watcher = fs.watch(path.join(rootDir, 'src'), { recursive: true });
  let timer = null;
  for await (const event of watcher) {
    if (!event.filename) continue;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await buildAll();
      } catch (err) {
        console.error('[build] Error:', err);
      }
    }, 80);
  }
} else {
  await buildAll();
}
