# Composing charts with Recharts

Deeper reference for the `recharts` skill — read this when one chart
isn't enough, when you need a11y, or when you're animating charts with
Remotion. The base SKILL.md covers the single-chart 80%; this file
covers the multi-chart / cross-cutting 20%.

## 1. Multi-chart layouts

Dashboards almost always show several charts at once. CSS grid is the
right primitive — it gives each card an explicit row height, which
`<ResponsiveContainer>` then measures cleanly.

```tsx
<section
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gridAutoRows: 320,           // explicit row height — solves the #1 footgun
    gap: 16,
  }}
>
  <Card><LineChart … /></Card>
  <Card><BarChart  … /></Card>
  <Card><AreaChart … /></Card>
</section>
```

`auto-fit` + `minmax(320px, 1fr)` is the standard responsive-tile
recipe; `gridAutoRows: 320` (or a `vh`-based value) is what stops the
charts from collapsing.

If you must use flexbox: `flex: 1 1 320px; min-width: 0;` on each card
plus an explicit height on the chart container.

## 2. Synchronised tooltips and brushes (`syncId`)

Stacking three time-series charts that all share the same x-axis? Pass
the same `syncId` to each and Recharts will broadcast hover + brush
events between them — hover over April on the revenue chart and the
users chart highlights April too.

```tsx
<LineChart data={revenue} syncId="finance">…</LineChart>
<LineChart data={cost}    syncId="finance">…</LineChart>
<AreaChart data={margin}  syncId="finance">
  <Brush dataKey="month" height={24} stroke="#2563eb" />
</AreaChart>
```

The `<Brush>` only needs to live on one chart; the `syncId` propagates
the selected range to the others. Two gotchas:

- All charts in a sync group must have the **same number of rows in the
  same order**. Recharts syncs by `activeIndex`, not by x-value. If
  arrays diverge, hovering goes off-by-one.
- `syncId` does NOT sync zoom — only hover and brush range. For a true
  zoom-sync you have to lift `<Brush>`'s `startIndex` / `endIndex` to
  state and pass them back down.

## 3. ComposedChart — bars + lines together

When a single chart needs mixed marks (bars for volume, line for moving
average), use `<ComposedChart>`:

```tsx
<ComposedChart data={rows}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="day" />
  <YAxis yAxisId="left"  orientation="left" />
  <YAxis yAxisId="right" orientation="right" />
  <Tooltip />
  <Bar  yAxisId="left"  dataKey="volume" fill="#94a3b8" />
  <Line yAxisId="right" dataKey="ma20"   stroke="#2563eb" dot={false} />
</ComposedChart>
```

Note the dual y-axes via `yAxisId` — required whenever the series have
different units.

## 4. Accessibility

Recharts 2.10+ ships an `accessibilityLayer` prop on every cartesian
chart that adds keyboard navigation (arrow keys move through ticks) and
makes the chart focusable. Turn it on:

```tsx
<LineChart data={rows} accessibilityLayer aria-label="Monthly revenue, in USD">
  …
</LineChart>
```

Best-practice checklist:

- **`aria-label` on the chart root.** Screen readers otherwise announce
  the chart as `"graphic"` and nothing else. The label should describe
  what the chart is, not how it looks ("Monthly revenue, in USD" not
  "Blue line going up").
- **Visible focus styles.** `accessibilityLayer` sets `tabindex=0` on
  the chart's `<svg>`; if your global CSS resets `outline: none`, add
  one back: `svg:focus-visible { outline: 2px solid #2563eb; }`.
- **Provide a data table fallback** for screen reader users — render
  a visually-hidden `<table>` with the same rows alongside the chart.
  This is the single highest-impact a11y move for charts.
- **Don't rely on colour alone.** Distinguish series with `strokeDasharray`
  patterns or markers in addition to `stroke` colour, so colour-blind
  viewers can still tell them apart.
- **Tooltip text must be selectable.** Default Recharts tooltips render
  text in an absolutely-positioned `<div>`; that's fine for screen
  readers but the `pointer-events: none` style some demos add will
  break selection — don't copy that pattern.

## 5. Recharts + Remotion

The composition story that justifies scaffolding both skills together:
**Remotion can render Recharts SVGs frame-by-frame as MP4 video**,
animating either the data or the chart's progress through itself.

### Setup

If you scaffolded with `skillpack react remotion recharts`, you already
have `src/video/MyVideo.tsx` (from remotion) and
`src/components/Dashboard.tsx` (from recharts). Create a new
composition that drives a Recharts chart from `useCurrentFrame()`:

```tsx
// src/video/RevenueReel.tsx
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';

const fullSeries = [
  { month: 'Jan', revenue: 12_400 },
  { month: 'Feb', revenue: 13_900 },
  // …12 points total
];

export const RevenueReel = (): JSX.Element => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Reveal one data point per ~10 frames.
  const visibleCount = Math.max(
    1,
    Math.floor(interpolate(frame, [0, durationInFrames], [1, fullSeries.length], {
      extrapolateRight: 'clamp',
    })),
  );
  const data = fullSeries.slice(0, visibleCount);

  return (
    <div style={{ width: 1080, height: 1080, background: '#fff', padding: 64 }}>
      <h1>Revenue, 2024</h1>
      <ResponsiveContainer width="100%" height={800}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={[0, 32_000]} />        {/* fix the axis or it'll re-scale every frame */}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={4}
            isAnimationActive={false}            {/* Remotion is the animator; disable Recharts' own */}
            dot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

Register it in `src/video/Root.tsx` as a sibling `<Composition />`,
then `npm run video:render` produces an MP4 of the chart drawing itself
in over the duration.

### The three rules of Recharts-in-Remotion

1. **`isAnimationActive={false}` on every series.** Recharts' built-in
   transition animations are wall-clock driven (`requestAnimationFrame`),
   not frame-clock driven. They'll desync from Remotion's deterministic
   timeline and render as judder in the final MP4. Drive all visual
   change from `useCurrentFrame()`.
2. **Fix `YAxis` / `XAxis` domains explicitly.** When you grow the data
   array frame-by-frame, Recharts' auto-domain re-fits each frame, which
   makes the chart "jump" as new max values appear. Pin
   `domain={[min, max]}` on both axes.
3. **No `<ResponsiveContainer>` percent heights inside Remotion.** Remotion
   compositions have known pixel dimensions (`useVideoConfig()`); just
   pass `width={1080} height={800}` directly. `ResponsiveContainer`
   still works, but you're paying for a `ResizeObserver` you don't need.

### Beyond progressive reveal

Same pattern, different inputs:

- **Animate values, not visibility.** Interpolate each row's `revenue`
  from 0 to its final value over a per-row window.
- **Animate axis range.** Have the y-axis zoom in on a region of
  interest by interpolating `domain={[lo(frame), hi(frame)]}`.
- **Sequence multiple charts.** Wrap each chart in a Remotion
  `<Sequence from={…} durationInFrames={…}>` so they appear in turn —
  the standard "data story" video format.

See `upstream/rules/timing.md` (from the remotion skill) for the full
`interpolate` / `spring` toolkit that drives all of the above.
