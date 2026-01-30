export interface SignedThinking {
  text: string;
  signature: string;
}

export interface SignatureStore {
  get(sessionKey: string): SignedThinking | undefined;
  set(sessionKey: string, value: SignedThinking): void;
  has(sessionKey: string): boolean;
  delete(sessionKey: string): void;
}

export interface StreamingCallbacks {
  onCacheSignature?: (sessionKey: string, text: string, signature: string) => void;
  onInjectDebug?: (response: unknown, debugText: string) => unknown;
  // Note: onInjectSyntheticThinking removed - keep_thinking now unified with debug via debugText
  transformThinkingParts?: (parts: unknown) => unknown;
}

export interface StreamingOptions {
  signatureSessionKey?: string;
  debugText?: string;
  cacheSignatures?: boolean;
  displayedThinkingHashes?: Set<string>;
  // Note: injectSyntheticThinking removed - keep_thinking now unified with debug via debugText
}

export interface ThoughtBuffer {
  get(index: number): string | undefined;
  set(index: number, text: string): void;
  clear(): void;
}
