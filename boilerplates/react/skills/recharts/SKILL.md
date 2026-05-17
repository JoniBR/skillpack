---
name: react-recharts
description: Composable, declarative charts with Recharts 2 in this React project. Use whenever the user wants charts, dashboards, analytics views, KPIs, sparklines, time-series visualisations, bar / line / area / pie / radar / scatter / radial / treemap displays — anything that turns numbers into SVG. The scaffold already ships a working <Dashboard /> with Line + Bar + Area charts wired into the home page. Prefer this skill over hand-rolled D3, Chart.js shims, or generic React advice whenever a chart is involved.
---

# Recharts (skillpack react skill)

[Recharts](https://recharts.org) is a composable charting library built on
React components + SVG. You describe the chart as JSX — `<LineChart>` with
`<Line>`, `<XAxis>`, `<Tooltip>` children — and Recharts handles the SVG
math, animation, and pointer hit-testing. No imperative D3 calls.

## What's already done for you

skillpack scaffolded a working chart setup. Specifically:

- Installed `recharts` (`^2.13.0`).
- Dropped `src/components/Dashboard.tsx` with three canonical chart shapes:
  a `<LineChart>` (monthly revenue, 12 points), a `<BarChart>`
  (categorical sales, 5 bars), and an `<AreaChart>` (cumulative growth
  with a gradient fill). Each chart sits inside a
  `<ResponsiveContainer width="100%" height={300}>` and a bordered card.
- Mounted `<Dashboard />` at the `@skillpack:mount` marker in
  `src/App.tsx`. Run `npm run dev` and you have charts on the home page.

So the typical first session is: edit `src/components/Dashboard.tsx`,
swap the mock arrays for real data, and rename / restyle as needed.

## File layout

| Path                              | Role                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `src/components/Dashboard.tsx`    | Sample analytics page. Edit or duplicate per view.       |
| (no config files)                 | Recharts has zero config — it's pure components.         |

## Core API cheatsheet

The 80/20 of Recharts is a small set of pieces that compose:

| Component               | What it is                                                   |
| ----------------------- | ------------------------------------------------------------ |
| `<ResponsiveContainer>` | Sizes children to the parent box. **Always wrap charts.**    |
| `<LineChart>` / `<BarChart>` / `<AreaChart>` / `<PieChart>` / `<ScatterChart>` / `<RadarChart>` | Chart roots. Take `data` and a `margin`. |
| `<XAxis>` / `<YAxis>`   | Axes. `dataKey="month"` binds to your row field.             |
| `<CartesianGrid>`       | Background grid lines.                                 |
| `<Tooltip>`             | Hover-driven readout. Pass `content={<MyTip />}` to customise. |
| `<Legend>`              | Series legend, auto-derived from `dataKey`s.                 |
| `<Line>` / `<Bar>` / `<Area>` / `<Pie>` / `<Scatter>` | Series — one per metric. |
| `<Cell>`                | Per-datum override (esp. `fill`) inside `<Bar>` / `<Pie>`.   |
| `<Brush>`               | Range selector at the bottom; great for long time series.    |
| `<ReferenceLine>` / `<ReferenceArea>` / `<ReferenceDot>` | Annotations.    |

## Composition pattern

Every chart follows the same shape:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

Two series? Add a second `<Line dataKey="cost" />` — the default
`<Tooltip>` will read every `<Line>` / `<Bar>` / `<Area>` and show all
values on hover. Want a stacked area? Set `stackId="a"` on each
`<Area>`. For a **diverging stack** (e.g. churn below zero, new MRR
above zero) also set `stackOffset="sign"` on the chart root, otherwise
negative values pile on top of the positives. Want bars and a line
together? Swap the root for `<ComposedChart>` and nest `<Bar>` +
`<Line>` as siblings. Want per-bar colours (e.g. red/amber/green by
status)? Don't pass a function to `<Bar fill>` — Recharts 2 evaluates
it once. Render `<Cell fill={…} />` children inside `<Bar>` instead,
one per row.

```tsx
<Bar dataKey="revenue">
  {rows.map((r) => (
    <Cell key={r.segment} fill={r.pct >= 1 ? '#10b981' : '#ef4444'} />
  ))}
</Bar>
```

## Data shape

Recharts wants a flat array of plain objects, one per X-tick:

```ts
const rows = [
  { month: 'Jan', revenue: 12_400, cost: 8_100 },
  { month: 'Feb', revenue: 13_900, cost: 8_400 },
];
```

`dataKey` on each axis / series picks the field. There is no
long-format / pivot helper — reshape your data yourself (or use
`d3-array`'s `rollup`) before handing it to Recharts.

## Pitfalls (the recharts greatest hits)

1. **`<ResponsiveContainer>` needs a sized parent.** It measures its
   parent's resolved height. If the parent has no height — typical inside
   flex columns or grid rows with `auto` sizing — the container resolves
   to 0px and the chart renders blank. Fixes, in order of preference:
   - Give the chart card an explicit pixel or vh height.
   - Or set the container's parent to `display: grid; grid-template-rows: 1fr`.
   - Or pass `aspect={16/9}` instead of `height={…}`.
2. **Don't put charts in `flex` without `min-width: 0`.** Flex children
   default to `min-width: auto`, which ignores their content's intrinsic
   width and refuses to shrink. The `<ResponsiveContainer>` then never
   gets a "smaller" resize event and the SVG overflows. Set
   `min-width: 0` on the flex item. (Our scaffold's `cardStyle` already
   does this defensively.)
3. **Animation + Tooltip race on rapid data updates.** When `data`
   changes faster than `animationDuration` (1500ms default), tooltips can
   read stale points and React logs a warning. For live-updating charts
   set `isAnimationActive={false}` on the series, or lower
   `animationDuration={300}`.
4. **SSR is borked out of the box.** `<ResponsiveContainer>` uses
   `ResizeObserver` and reads `window` during measurement; under Next.js
   App Router this throws on the server. Either render charts in a
   client component (`'use client'` at the top of the file) or import
   them via `next/dynamic` with `ssr: false`.
5. **`dataKey` must be a string, not a getter.** `dataKey={(d) => d.x.y}`
   works but breaks tooltips that try to look up the field by key.
   Prefer flattening data once at fetch time.
6. **Legend payload is computed once.** If you toggle series visibility
   by conditionally rendering `<Line />`, the legend re-flows. To hide a
   series without re-flow, render it with `hide={true}` instead.
7. **`Pie` needs `cx`, `cy`, `outerRadius` for predictable sizing.**
   `<Pie>` defaults to percentages of the chart box but won't centre
   itself if you've added a `<Legend>` — set them explicitly.
8. **Don't import from `recharts/es6` or deep paths.** The published
   entry handles tree-shaking; deep imports break in Recharts 3 and
   already warn in 2.x.

## Accessibility (do this, it's two props)

Every cartesian chart in Recharts 2.10+ accepts `accessibilityLayer`
(keyboard nav, focus ring, screen-reader ticks) and a plain
`aria-label`. Add both on every chart you ship:

```tsx
<LineChart data={rows} accessibilityLayer aria-label="Monthly revenue, in USD">
  …
</LineChart>
```

Describe what the chart *is*, not what it looks like. See
`references/composing-charts.md` §4 for the full a11y checklist
(visible focus styles, data-table fallback, don't-rely-on-colour).

## Layout & responsive breakpoints

The scaffold's grid uses `repeat(auto-fit, minmax(320px, 1fr))` which
gives a soft breakpoint based on tile size. For an **exact** pixel
breakpoint (e.g. "2-up ≥768px, 1-up below"), drop a real `@media` rule:

```tsx
<style>{`@media (max-width: 767px) { .dashboard-grid { grid-template-columns: 1fr !important; } }`}</style>
<div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>…</div>
```

Auto-fit alone won't honour a specific px cut-over because it sizes
from tile width, not viewport width.

## Custom tooltip

The default tooltip is fine for prototypes. For anything user-facing,
ship your own:

```tsx
function MoneyTip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8 }}>
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey as string}>
          {p.name}: ${p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

<Tooltip content={<MoneyTip />} />
```

Import `TooltipProps` from `recharts` for the types.

## Going deeper

See `references/composing-charts.md` (shipped alongside this SKILL.md) for:

- Multi-chart layouts and synchronised brushes (`syncId`).
- Accessibility — `accessibilityLayer`, `aria-label`, keyboard nav.
- Animating charts frame-by-frame from Remotion's `useCurrentFrame()`
  — the genuinely interesting story when you've scaffolded
  `skillpack react remotion recharts` together.

For everything else, https://recharts.org/en-US/api is the canonical
reference. The API surface is small enough that you can skim the left
sidebar in one sitting.
