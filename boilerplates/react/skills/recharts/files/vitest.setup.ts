import '@testing-library/jest-dom/vitest';

// jsdom (used by vitest) does not implement ResizeObserver, but recharts'
// <ResponsiveContainer> calls it during mount. Without this polyfill, any
// component test that renders a chart throws "ResizeObserver is not defined".
// Polyfilling here keeps the recharts skill from breaking the base App test.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// jsdom gives <ResponsiveContainer>'s parent a 0x0 layout box, so Recharts
// logs a noisy `The width(0) and height(0) of chart should be greater than 0`
// warning on every test that mounts a chart. The polyfill above already
// prevents the actual crash; this filter just keeps test output readable.
// Remove the filter (and set a fixed pixel size on your test wrapper) if
// you ever want to assert on chart geometry.
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]): void => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('width(0) and height(0) of chart')) {
    return;
  }
  originalWarn(...(args as Parameters<typeof console.warn>));
};
