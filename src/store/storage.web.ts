/** On web, expo-sqlite needs WASM + cross-origin isolation headers; localStorage is enough here. */
export const persistStorage = {
  getItem: (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  removeItem: (key: string) => globalThis.localStorage?.removeItem(key),
};
