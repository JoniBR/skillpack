---
name: react-satori
description: Open Graph / social-card image generation with Vercel's satori in this React + Vite project. Use whenever the user wants to render JSX to an image — OG cards, Twitter/X cards, blog hero images, dynamic badges, anything where the output is a PNG (or SVG) rather than a live React component. This skill wraps the community `satori-skilld` skill (under `upstream/`) and explains how it's wired into this specific skillpack-scaffolded project. Use this skill instead of generic React advice whenever satori is involved.
---

# Satori (skillpack react skill)

[Satori](https://github.com/vercel/satori) renders a tiny subset of HTML +
CSS (via JSX) into SVG, which we then rasterise to PNG. This skill is the
**skillpack-react adapter** around the community `satori-skilld` skill,
which lives under `upstream/SKILL.md`. The upstream material is the source
of truth for satori API knowledge; this file is a thin preamble explaining
what skillpack already set up for you and where things are.

## What's already done for you

skillpack scaffolded a working satori setup. You **do not** need to write
a script from scratch or pick a rasteriser. Specifically, the scaffold has
already:

- Installed `satori` as a runtime dep, plus `@resvg/resvg-js` (SVG → PNG
  rasteriser) and `tsx` (run TS without a build step) as devDeps.
- Added an example 1200×630 JSX template at `src/og/SocialCard.tsx`.
- Added a node-side generator at `scripts/og.ts` that loads Inter
  (Regular + Bold) from jsDelivr, runs satori, rasterises with resvg,
  and writes the PNG to `public/og/card.png`.
- Added `npm run og:generate` (script entrypoint).

Satori is a **node-side** tool — it does not mount into the React app.
The Vite app simply serves the generated PNG from `public/og/` like any
other static asset (e.g. `<meta property="og:image" content="/og/card.png" />`).

## File layout (this project's conventions)

| Path                     | Role                                                        |
| ------------------------ | ----------------------------------------------------------- |
| `src/og/SocialCard.tsx`  | JSX template that satori renders. Pure component, no hooks. |
| `scripts/og.ts`          | Node generator. Loads fonts, calls satori, writes PNG.      |
| `public/og/card.png`     | Generated output. Served at `/og/card.png` by Vite.         |

`scripts/og.ts` imports `SocialCard` from `src/og/` via `tsx`, so the
template **must not** import browser-only APIs (no `window`, no `document`,
no Vite-resolved `import logo from './logo.png'`, no CSS modules). Treat
`src/og/` as a Node-compatible island inside the React project.

Two small TS conventions worth copying when you add a new template /
generator:

- **Import with a `.js` extension even though the file is `.tsx`** —
  e.g. `import { SocialCard } from '../src/og/SocialCard.js'`. This is
  required by the project’s ESM/NodeNext module resolution. It looks
  wrong but is correct.
- **Invoke the template as a plain function**, not as JSX:
  ```ts
  const element = SocialCard(props) as Parameters<typeof satori>[0];
  const svg = await satori(element, { width, height, fonts });
  ```
  This avoids a JSX-runtime mismatch between the Node script and the
  Vite app, and sidesteps a `ReactNode` vs `ReactElement` type error
  under strict TS.

## Scripts added by this skill

| Script        | Command                |
| ------------- | ---------------------- |
| `og:generate` | `tsx scripts/og.ts`    |

Re-run after editing either `SocialCard.tsx` or `scripts/og.ts`. Output
goes to `public/og/card.png`. To render more cards, add additional
`renderCard({...}, 'public/og/<name>.png')` calls inside `main()` in
`scripts/og.ts`.

## skillpack-specific footguns

Things that bite fresh agents using satori in this scaffold:

1. **Fonts must be loaded explicitly.** Satori ignores `font-family`
   unless the matching font binary is passed via `options.fonts`. Our
   `scripts/og.ts` fetches Inter Regular + Bold from jsDelivr at run
   time. To use another font, add another `fetchFont(url)` call and
   another entry in the `fonts` array — `name` must match the
   `fontFamily` you use in the JSX.
2. **No WOFF2.** Satori only accepts TTF, OTF, and WOFF. WOFF2 silently
   fails to render glyphs. The CDN URLs in `scripts/og.ts` point at
   `.woff` files (via `@fontsource/inter` on jsDelivr) for this reason.
3. **CSS subset is small.** Flexbox only — no `display: block`, no CSS
   grid, no floats. Every element with multiple children needs
   `display: flex`. No animations, no transitions, no pseudo-elements,
   no CSS variables, no `calc()`. Limited transforms (translate / scale
   / rotate only, leaf nodes only). See `upstream/SKILL.md` for the
   full whitelist.
4. **Colors in gradients must be hex or rgb — NOT `hsl()`.** satori
   0.10’s `css-gradient-parser` throws `Missing )` on any `hsl(…)`
   stop inside `linear-gradient` / `radial-gradient`. CSS named colors
   (`tomato`, `rebeccapurple`, etc.) and `hsla()` also fail in gradients.
   Solid `backgroundColor` accepts more (named colors, `hsl()`, etc.),
   but gradients do not. If you need a per-item color derived from a
   hash / slug, compute HSL and convert to `#rrggbb` before interpolating
   into the gradient string. Example helper:
   ```ts
   function hslToHex(h: number, s: number, l: number) {
     const a = (s * Math.min(l, 1 - l)) / 100;
     const f = (n: number) => {
       const k = (n + h / 30) % 12;
       const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
       return Math.round(255 * c).toString(16).padStart(2, '0');
     };
     return `#${f(0)}${f(8)}${f(4)}`;
   }
   ```
5. **Fixed pixel sizes.** Width and height are passed to `satori()` in
   px. Inside the JSX, avoid `vh` / `vw` / `%` of the viewport (most
   percentage values work as percent-of-parent but not as
   percent-of-canvas).
6. **Network access is required by default.** Font fetching hits
   jsDelivr. For air-gapped / CI environments, vendor the font binaries
   under `public/fonts/` and read them with `fs.readFile` instead of
   `fetch`.
7. **Cache fonts across calls.** Satori uses a `WeakMap` keyed on the
   fonts array reference — recreating the array on each render misses
   the cache and costs ~2× perf. Our script caches via a module-level
   promise; preserve that pattern if you refactor.

## How to use the upstream skill

For everything about the satori API itself — supported CSS, Tailwind
mode, `loadAdditionalAsset` for emoji / CJK fonts, `embedFont`,
variable fonts, edge-runtime usage, etc. — **load `upstream/SKILL.md`**.
It is a tightly-written skill maintained by the community (originally
shipped with `nuxt-modules/og-image`). The upstream skill includes a
"Best Practices" block and an "API Changes" block that are the
authoritative reference for current satori behaviour.

If the upstream skill tells you to install satori or pick a rasteriser
— skip that. Skillpack already did it.

## When in doubt

Read `upstream/SKILL.md` end-to-end (it's short — under 100 lines, all
pointers), then run `skilld search "..." -p satori` if `skilld` is on
PATH for deep questions. Otherwise: the satori README and the
`upstream/SKILL.md` "Best Practices" section cover ~90% of real bugs.
