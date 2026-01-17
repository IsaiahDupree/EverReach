// Ensure globals exist before jest-expo preset runs
if (typeof globalThis.window === 'undefined' || globalThis.window == null) {
  globalThis.window = globalThis;
}
if (typeof globalThis.navigator !== 'object' || globalThis.navigator == null) {
  globalThis.navigator = {};
}
// Mirror navigator across globals
globalThis.window.navigator = globalThis.navigator;
// Ensure global.navigator exists for libraries that reference it directly
// @ts-ignore
global.navigator = globalThis.navigator;

try {
  Object.defineProperty(globalThis.navigator, 'product', {
    value: 'ReactNative',
    configurable: true,
    writable: false,
  });
} catch (_) {
  // ignore if cannot define
}
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
