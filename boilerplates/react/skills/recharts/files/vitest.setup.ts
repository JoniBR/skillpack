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
