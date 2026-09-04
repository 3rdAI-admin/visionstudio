import '@testing-library/jest-dom';

// Node's own experimental `localStorage` global (added recently, gated
// behind a `--localstorage-file` CLI flag we don't pass) shadows jsdom's
// working implementation in this test environment — the property exists but
// every call is a silent no-op. A plain in-memory polyfill sidesteps it;
// the app only needs the standard Storage interface, not persistence across
// runs. window and globalThis are the same object here (vitest's jsdom
// environment proxies window's keys onto global), so one definition covers
// both `localStorage` and `window.localStorage` references in app code.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});
