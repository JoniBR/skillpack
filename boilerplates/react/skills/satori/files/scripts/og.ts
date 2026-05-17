/**
 * Node-side Open Graph image generator.
 *
 *   pnpm og:generate    # (or npm/yarn run og:generate)
 *
 * Pipeline:
 *   1. Load Inter (Regular + Bold) from a public CDN.
 *      Satori only accepts TTF / OTF / WOFF — *not* WOFF2.
 *   2. Render `<SocialCard />` to SVG via satori. Note that satori does
 *      NOT resolve `font-family` against system fonts; the font binary
 *      must be passed in `options.fonts`.
 *   3. Rasterise the SVG to PNG with @resvg/resvg-js.
 *   4. Write to `public/og/card.png` so the Vite app can serve it at
 *      `/og/card.png`.
 *
 * Add more cards by calling `renderCard()` again with different
 * props + output paths. Keep this script free of browser-only imports.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { SocialCard, type SocialCardProps } from '../src/og/SocialCard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const WIDTH = 1200;
const HEIGHT = 630;

// jsDelivr mirrors the @fontsource/inter npm package and serves stable
// .woff binaries that satori accepts directly. Satori does NOT support
// WOFF2 — use .woff or .ttf/.otf instead.
const INTER_REGULAR =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff';
const INTER_BOLD =
  'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff';

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch font ${url}: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

// Module-level cache — satori uses a WeakMap keyed on the fonts array, so
// reusing the same array across calls keeps its internal cache warm.
let fontsPromise: Promise<Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }>> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([fetchFont(INTER_REGULAR), fetchFont(INTER_BOLD)]).then(
      ([regular, bold]) => [
        { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
        { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
      ],
    );
  }
  return fontsPromise;
}

export async function renderCard(props: SocialCardProps, outRelPath: string): Promise<void> {
  const fonts = await loadFonts();
  // satori accepts a React element. SocialCard is a plain component, so
  // we call it as a function — this also avoids any JSX-runtime mismatch
  // between the script and the Vite app.
  const element = SocialCard(props) as Parameters<typeof satori>[0];
  const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();

  const outAbs = resolve(projectRoot, outRelPath);
  await mkdir(dirname(outAbs), { recursive: true });
  await writeFile(outAbs, png);
  // eslint-disable-next-line no-console
  console.log(`✓ wrote ${outRelPath} (${(png.byteLength / 1024).toFixed(1)} KB)`);
}

async function main() {
  await renderCard(
    {
      title: 'Hello from skillpack',
      subtitle: 'Generate Open Graph images with React + satori.',
      eyebrow: 'skillpack · satori',
    },
    'public/og/card.png',
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
