import type { SignatureStore, SignedThinking, ThoughtBuffer } from '../core/streaming/types';

export function createSignatureStore(): SignatureStore {
  const store = new Map<string, SignedThinking>();

  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: SignedThinking) => {
      store.set(key, value);
    },
    has: (key: string) => store.has(key),
    delete: (key: string) => {
      store.delete(key);
    },
  };
}

export function createThoughtBuffer(): ThoughtBuffer {
  const buffer = new Map<number, string>();

  return {
    get: (index: number) => buffer.get(index),
    set: (index: number, text: string) => {
      buffer.set(index, text);
    },
    clear: () => buffer.clear(),
  };
}

export const defaultSignatureStore = createSignatureStore();
