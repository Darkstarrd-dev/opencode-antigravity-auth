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

/**
 * Store for mapping tool_use IDs to thought signatures.
 * Used for precise backfilling of missing thought_signatures in tool-calling loops.
 */
export function createToolUseSignatureStore() {
  const store = new Map<string, string>(); // sessionKey:toolId -> signature

  return {
    get: (sessionKey: string, toolId: string) => store.get(`${sessionKey}:${toolId}`),
    set: (sessionKey: string, toolId: string, signature: string) => {
      store.set(`${sessionKey}:${toolId}`, signature);
    },
    delete: (sessionKey: string, toolId: string) => {
      store.delete(`${sessionKey}:${toolId}`);
    },
    clearForSession: (sessionKey: string) => {
      for (const key of store.keys()) {
        if (key.startsWith(`${sessionKey}:`)) {
          store.delete(key);
        }
      }
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
export const toolUseSignatureStore = createToolUseSignatureStore();
