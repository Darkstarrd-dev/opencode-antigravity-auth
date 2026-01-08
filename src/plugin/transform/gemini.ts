/**
 * Gemini-specific Request Transformations
 * 
 * Handles Gemini model-specific request transformations including:
 * - Thinking config (camelCase keys, thinkingLevel for Gemini 3)
 * - Tool normalization (function/custom format)
 */

import type { RequestPayload, ThinkingConfig, ThinkingTier } from "./types";

/**
 * Check if a model is a Gemini model (not Claude).
 */
export function isGeminiModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes("gemini") && !lower.includes("claude");
}

/**
 * Check if a model is Gemini 3 (uses thinkingLevel string).
 */
export function isGemini3Model(model: string): boolean {
  return model.toLowerCase().includes("gemini-3");
}

/**
 * Check if a model is Gemini 2.5 (uses numeric thinkingBudget).
 */
export function isGemini25Model(model: string): boolean {
  return model.toLowerCase().includes("gemini-2.5");
}

/**
 * Build Gemini 3 thinking config with thinkingLevel string.
 */
export function buildGemini3ThinkingConfig(
  includeThoughts: boolean,
  thinkingLevel: ThinkingTier,
): ThinkingConfig {
  return {
    includeThoughts,
    thinkingLevel,
  };
}

/**
 * Build Gemini 2.5 thinking config with numeric thinkingBudget.
 */
export function buildGemini25ThinkingConfig(
  includeThoughts: boolean,
  thinkingBudget?: number,
): ThinkingConfig {
  return {
    includeThoughts,
    ...(typeof thinkingBudget === "number" && thinkingBudget > 0 ? { thinkingBudget } : {}),
  };
}

/**
 * Normalize tools for Gemini models.
 * Ensures tools have proper function-style format.
 * 
 * @returns Debug info about tool normalization
 */
export function normalizeGeminiTools(
  payload: RequestPayload,
): { toolDebugMissing: number; toolDebugSummaries: string[] } {
  let toolDebugMissing = 0;
  const toolDebugSummaries: string[] = [];

  if (!Array.isArray(payload.tools)) {
    return { toolDebugMissing, toolDebugSummaries };
  }

  payload.tools = (payload.tools as unknown[]).map((tool: unknown, toolIndex: number) => {
    const t = tool as Record<string, unknown>;
    const newTool = { ...t };

    const schemaCandidates = [
      (newTool.function as Record<string, unknown> | undefined)?.input_schema,
      (newTool.function as Record<string, unknown> | undefined)?.parameters,
      (newTool.function as Record<string, unknown> | undefined)?.inputSchema,
      (newTool.custom as Record<string, unknown> | undefined)?.input_schema,
      (newTool.custom as Record<string, unknown> | undefined)?.parameters,
      newTool.parameters,
      newTool.input_schema,
      newTool.inputSchema,
    ].filter(Boolean);

    const placeholderSchema: Record<string, unknown> = {
      type: "object",
      properties: {
        _placeholder: {
          type: "boolean",
          description: "Placeholder. Always pass true.",
        },
      },
      required: ["_placeholder"],
      additionalProperties: false,
    };

    let schema = schemaCandidates[0] as Record<string, unknown> | undefined;
    const schemaObjectOk = schema && typeof schema === "object" && !Array.isArray(schema);
    if (!schemaObjectOk) {
      schema = placeholderSchema;
      toolDebugMissing += 1;
    }

    const nameCandidate =
      newTool.name ||
      (newTool.function as Record<string, unknown> | undefined)?.name ||
      (newTool.custom as Record<string, unknown> | undefined)?.name ||
      `tool-${toolIndex}`;

    // Ensure function has input_schema
    if (newTool.function && !(newTool.function as Record<string, unknown>).input_schema && schema) {
      (newTool.function as Record<string, unknown>).input_schema = schema;
    }
    
    // Ensure custom has input_schema
    if (newTool.custom && !(newTool.custom as Record<string, unknown>).input_schema && schema) {
      (newTool.custom as Record<string, unknown>).input_schema = schema;
    }
    
    // Create custom from function if missing
    if (!newTool.custom && newTool.function) {
      const fn = newTool.function as Record<string, unknown>;
      newTool.custom = {
        name: fn.name || nameCandidate,
        description: fn.description,
        input_schema: schema,
      };
    }

    // Create custom if both missing
    if (!newTool.custom && !newTool.function) {
      newTool.custom = {
        name: nameCandidate,
        description: newTool.description,
        input_schema: schema,
      };

      if (!newTool.parameters && !newTool.input_schema && !newTool.inputSchema) {
        newTool.parameters = schema;
      }
    }
    
    // Ensure custom has input_schema
    if (newTool.custom && !(newTool.custom as Record<string, unknown>).input_schema) {
      (newTool.custom as Record<string, unknown>).input_schema = { 
        type: "object", 
        properties: {}, 
        additionalProperties: false 
      };
      toolDebugMissing += 1;
    }

    toolDebugSummaries.push(
      `idx=${toolIndex}, hasCustom=${!!newTool.custom}, customSchema=${!!(newTool.custom as Record<string, unknown> | undefined)?.input_schema}, hasFunction=${!!newTool.function}, functionSchema=${!!(newTool.function as Record<string, unknown> | undefined)?.input_schema}`,
    );

    // Strip custom wrappers for Gemini; only function-style is accepted.
    if (newTool.custom) {
      delete newTool.custom;
    }

    return newTool;
  });

  return { toolDebugMissing, toolDebugSummaries };
}

/**
 * Apply all Gemini-specific transformations to a request payload.
 */
export interface GeminiTransformOptions {
  /** The effective model name (resolved) */
  model: string;
  /** Tier-based thinking budget (from model suffix, for Gemini 2.5) */
  tierThinkingBudget?: number;
  /** Tier-based thinking level (from model suffix, for Gemini 3) */
  tierThinkingLevel?: ThinkingTier;
  /** Normalized thinking config from user settings */
  normalizedThinking?: { includeThoughts?: boolean; thinkingBudget?: number };
}

export interface GeminiTransformResult {
  toolDebugMissing: number;
  toolDebugSummaries: string[];
}

/**
 * Apply all Gemini-specific transformations.
 */
export function applyGeminiTransforms(
  payload: RequestPayload,
  options: GeminiTransformOptions,
): GeminiTransformResult {
  const { model, tierThinkingBudget, tierThinkingLevel, normalizedThinking } = options;

  // 1. Apply thinking config if needed
  if (normalizedThinking) {
    let thinkingConfig: ThinkingConfig;

    if (tierThinkingLevel && isGemini3Model(model)) {
      // Gemini 3 uses thinkingLevel string
      thinkingConfig = buildGemini3ThinkingConfig(
        normalizedThinking.includeThoughts ?? true,
        tierThinkingLevel,
      );
    } else {
      // Gemini 2.5 and others use numeric budget
      const thinkingBudget = tierThinkingBudget ?? normalizedThinking.thinkingBudget;
      thinkingConfig = buildGemini25ThinkingConfig(
        normalizedThinking.includeThoughts ?? true,
        thinkingBudget,
      );
    }

    const generationConfig = (payload.generationConfig ?? {}) as Record<string, unknown>;
    generationConfig.thinkingConfig = thinkingConfig;
    payload.generationConfig = generationConfig;
  }

  // 2. Normalize tools
  return normalizeGeminiTools(payload);
}
