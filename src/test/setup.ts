import '@testing-library/jest-dom/vitest';

// jsdom non implementa canvas né ResizeObserver: stub minimi così l'hero 3D si monta senza rumore in stderr.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
// jsdom non implementa nemmeno lo scorrimento della finestra.
window.scrollTo = (() => {}) as typeof window.scrollTo;
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
