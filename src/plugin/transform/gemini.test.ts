import { describe, it, expect } from "vitest";
import {
  isGeminiModel,
  isGemini3Model,
  isGemini25Model,
  buildGemini3ThinkingConfig,
  buildGemini25ThinkingConfig,
  normalizeGeminiTools,
  applyGeminiTransforms,
} from "./gemini";
import type { RequestPayload } from "./types";

describe("transform/gemini", () => {
  describe("isGeminiModel", () => {
    it("returns true for gemini-pro", () => {
      expect(isGeminiModel("gemini-pro")).toBe(true);
    });

    it("returns true for gemini-1.5-pro", () => {
      expect(isGeminiModel("gemini-1.5-pro")).toBe(true);
    });

    it("returns true for gemini-2.5-flash", () => {
      expect(isGeminiModel("gemini-2.5-flash")).toBe(true);
    });

    it("returns true for gemini-3-pro-high", () => {
      expect(isGeminiModel("gemini-3-pro-high")).toBe(true);
    });

    it("returns true for uppercase GEMINI-PRO", () => {
      expect(isGeminiModel("GEMINI-PRO")).toBe(true);
    });

    it("returns true for mixed case Gemini-Pro", () => {
      expect(isGeminiModel("Gemini-Pro")).toBe(true);
    });

    it("returns false for claude-3-opus", () => {
      expect(isGeminiModel("claude-3-opus")).toBe(false);
    });

    it("returns false for gpt-4", () => {
      expect(isGeminiModel("gpt-4")).toBe(false);
    });

    it("returns false for gemini-claude hybrid (contains both)", () => {
      expect(isGeminiModel("gemini-claude-hybrid")).toBe(false);
    });

    it("returns false for claude-on-gemini", () => {
      expect(isGeminiModel("claude-on-gemini")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isGeminiModel("")).toBe(false);
    });
  });

  describe("isGemini3Model", () => {
    it("returns true for gemini-3-pro", () => {
      expect(isGemini3Model("gemini-3-pro")).toBe(true);
    });

    it("returns true for gemini-3-pro-high", () => {
      expect(isGemini3Model("gemini-3-pro-high")).toBe(true);
    });

    it("returns true for gemini-3-flash", () => {
      expect(isGemini3Model("gemini-3-flash")).toBe(true);
    });

    it("returns true for uppercase GEMINI-3-PRO", () => {
      expect(isGemini3Model("GEMINI-3-PRO")).toBe(true);
    });

    it("returns false for gemini-2.5-pro", () => {
      expect(isGemini3Model("gemini-2.5-pro")).toBe(false);
    });

    it("returns false for gemini-pro", () => {
      expect(isGemini3Model("gemini-pro")).toBe(false);
    });

    it("returns false for claude-3-opus", () => {
      expect(isGemini3Model("claude-3-opus")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isGemini3Model("")).toBe(false);
    });
  });

  describe("isGemini25Model", () => {
    it("returns true for gemini-2.5-pro", () => {
      expect(isGemini25Model("gemini-2.5-pro")).toBe(true);
    });

    it("returns true for gemini-2.5-flash", () => {
      expect(isGemini25Model("gemini-2.5-flash")).toBe(true);
    });

    it("returns true for gemini-2.5-pro-preview", () => {
      expect(isGemini25Model("gemini-2.5-pro-preview")).toBe(true);
    });

    it("returns true for uppercase GEMINI-2.5-PRO", () => {
      expect(isGemini25Model("GEMINI-2.5-PRO")).toBe(true);
    });

    it("returns false for gemini-3-pro", () => {
      expect(isGemini25Model("gemini-3-pro")).toBe(false);
    });

    it("returns false for gemini-2.0-flash", () => {
      expect(isGemini25Model("gemini-2.0-flash")).toBe(false);
    });

    it("returns false for gemini-pro", () => {
      expect(isGemini25Model("gemini-pro")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isGemini25Model("")).toBe(false);
    });
  });

  describe("buildGemini3ThinkingConfig", () => {
    it("builds config with includeThoughts true and low tier", () => {
      const config = buildGemini3ThinkingConfig(true, "low");
      expect(config).toEqual({
        includeThoughts: true,
        thinkingLevel: "low",
      });
    });

    it("builds config with includeThoughts true and medium tier", () => {
      const config = buildGemini3ThinkingConfig(true, "medium");
      expect(config).toEqual({
        includeThoughts: true,
        thinkingLevel: "medium",
      });
    });

    it("builds config with includeThoughts true and high tier", () => {
      const config = buildGemini3ThinkingConfig(true, "high");
      expect(config).toEqual({
        includeThoughts: true,
        thinkingLevel: "high",
      });
    });

    it("builds config with includeThoughts false", () => {
      const config = buildGemini3ThinkingConfig(false, "high");
      expect(config).toEqual({
        includeThoughts: false,
        thinkingLevel: "high",
      });
    });
  });

  describe("buildGemini25ThinkingConfig", () => {
    it("builds config with includeThoughts true and budget", () => {
      const config = buildGemini25ThinkingConfig(true, 8192);
      expect(config).toEqual({
        includeThoughts: true,
        thinkingBudget: 8192,
      });
    });

    it("builds config with includeThoughts false and budget", () => {
      const config = buildGemini25ThinkingConfig(false, 16384);
      expect(config).toEqual({
        includeThoughts: false,
        thinkingBudget: 16384,
      });
    });

    it("builds config without budget when undefined", () => {
      const config = buildGemini25ThinkingConfig(true, undefined);
      expect(config).toEqual({
        includeThoughts: true,
      });
      expect(config).not.toHaveProperty("thinkingBudget");
    });

    it("builds config without budget when zero", () => {
      const config = buildGemini25ThinkingConfig(true, 0);
      expect(config).toEqual({
        includeThoughts: true,
      });
      expect(config).not.toHaveProperty("thinkingBudget");
    });

    it("builds config without budget when negative", () => {
      const config = buildGemini25ThinkingConfig(true, -1000);
      expect(config).toEqual({
        includeThoughts: true,
      });
      expect(config).not.toHaveProperty("thinkingBudget");
    });

    it("builds config with large budget", () => {
      const config = buildGemini25ThinkingConfig(true, 100000);
      expect(config).toEqual({
        includeThoughts: true,
        thinkingBudget: 100000,
      });
    });
  });

  describe("normalizeGeminiTools", () => {
    it("returns empty debug info when tools is not an array", () => {
      const payload: RequestPayload = { contents: [] };
      const result = normalizeGeminiTools(payload);
      expect(result).toEqual({
        toolDebugMissing: 0,
        toolDebugSummaries: [],
      });
    });

    it("returns empty debug info when tools is undefined", () => {
      const payload: RequestPayload = { contents: [], tools: undefined };
      const result = normalizeGeminiTools(payload);
      expect(result).toEqual({
        toolDebugMissing: 0,
        toolDebugSummaries: [],
      });
    });

    it("normalizes tool with function.input_schema", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          {
            function: {
              name: "test_tool",
              description: "A test tool",
              input_schema: { type: "object", properties: { foo: { type: "string" } } },
            },
          },
        ],
      };
      const result = normalizeGeminiTools(payload);
      expect(result.toolDebugMissing).toBe(0);
      expect(result.toolDebugSummaries).toHaveLength(1);
      expect((payload.tools as unknown[])[0]).not.toHaveProperty("custom");
    });

    it("normalizes tool with function.parameters", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          {
            function: {
              name: "test_tool",
              description: "A test tool",
              parameters: { type: "object", properties: { bar: { type: "number" } } },
            },
          },
        ],
      };
      const result = normalizeGeminiTools(payload);
      expect(result.toolDebugMissing).toBe(0);
    });

    it("creates custom from function and strips it for Gemini", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          {
            function: {
              name: "my_func",
              description: "My function",
              input_schema: { type: "object" },
            },
          },
        ],
      };
      normalizeGeminiTools(payload);
      expect((payload.tools as unknown[])[0]).not.toHaveProperty("custom");
      expect((payload.tools as unknown[])[0]).toHaveProperty("function");
    });

    it("creates custom when both function and custom are missing", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          {
            name: "standalone_tool",
            description: "A standalone tool",
            parameters: { type: "object", properties: {} },
          },
        ],
      };
      normalizeGeminiTools(payload);
      expect((payload.tools as unknown[])[0]).not.toHaveProperty("custom");
    });

    it("counts missing schemas", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          { name: "tool1" },
          { name: "tool2" },
          { function: { name: "tool3", input_schema: { type: "object" } } },
        ],
      };
      const result = normalizeGeminiTools(payload);
      expect(result.toolDebugMissing).toBe(2);
    });

    it("generates debug summaries for each tool", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          { function: { name: "t1", input_schema: { type: "object" } } },
          { function: { name: "t2", input_schema: { type: "object" } } },
        ],
      };
      const result = normalizeGeminiTools(payload);
      expect(result.toolDebugSummaries).toHaveLength(2);
      expect(result.toolDebugSummaries[0]).toContain("idx=0");
      expect(result.toolDebugSummaries[1]).toContain("idx=1");
    });

    it("uses default tool name when name is missing", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [{}],
      };
      const result = normalizeGeminiTools(payload);
      expect(result.toolDebugSummaries[0]).toContain("idx=0");
    });

    it("extracts schema from custom.input_schema", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          {
            custom: {
              name: "custom_tool",
              input_schema: { type: "object", properties: { x: { type: "string" } } },
            },
          },
        ],
      };
      normalizeGeminiTools(payload);
      expect((payload.tools as unknown[])[0]).not.toHaveProperty("custom");
    });

    it("extracts schema from inputSchema (camelCase)", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          {
            name: "camel_tool",
            inputSchema: { type: "object", properties: { y: { type: "boolean" } } },
          },
        ],
      };
      normalizeGeminiTools(payload);
      expect((payload.tools as unknown[])[0]).not.toHaveProperty("custom");
    });
  });

  describe("applyGeminiTransforms", () => {
    it("applies Gemini 3 thinking config with thinkingLevel", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-3-pro-high",
        tierThinkingLevel: "high",
        normalizedThinking: { includeThoughts: true },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect(genConfig.thinkingConfig).toEqual({
        includeThoughts: true,
        thinkingLevel: "high",
      });
    });

    it("applies Gemini 2.5 thinking config with thinkingBudget", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-2.5-flash",
        tierThinkingBudget: 8192,
        normalizedThinking: { includeThoughts: true },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect(genConfig.thinkingConfig).toEqual({
        includeThoughts: true,
        thinkingBudget: 8192,
      });
    });

    it("prefers tierThinkingBudget over normalizedThinking.thinkingBudget", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-2.5-pro",
        tierThinkingBudget: 16384,
        normalizedThinking: { includeThoughts: true, thinkingBudget: 8192 },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect((genConfig.thinkingConfig as Record<string, unknown>).thinkingBudget).toBe(16384);
    });

    it("falls back to normalizedThinking.thinkingBudget when tierThinkingBudget is undefined", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-2.5-pro",
        normalizedThinking: { includeThoughts: true, thinkingBudget: 4096 },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect((genConfig.thinkingConfig as Record<string, unknown>).thinkingBudget).toBe(4096);
    });

    it("does not apply thinking config when normalizedThinking is undefined", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-3-pro",
      });
      expect(payload.generationConfig).toBeUndefined();
    });

    it("preserves existing generationConfig properties", () => {
      const payload: RequestPayload = {
        contents: [],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      };
      applyGeminiTransforms(payload, {
        model: "gemini-3-pro-medium",
        tierThinkingLevel: "medium",
        normalizedThinking: { includeThoughts: true },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect(genConfig.temperature).toBe(0.7);
      expect(genConfig.maxOutputTokens).toBe(1000);
      expect(genConfig.thinkingConfig).toBeDefined();
    });

    it("normalizes tools and returns debug info", () => {
      const payload: RequestPayload = {
        contents: [],
        tools: [
          { function: { name: "tool1", input_schema: { type: "object" } } },
          { name: "tool2" },
        ],
      };
      const result = applyGeminiTransforms(payload, {
        model: "gemini-2.5-flash",
      });
      expect(result.toolDebugSummaries).toHaveLength(2);
      expect(result.toolDebugMissing).toBe(1);
    });

    it("defaults includeThoughts to true when not specified", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-3-pro-low",
        tierThinkingLevel: "low",
        normalizedThinking: {},
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect((genConfig.thinkingConfig as Record<string, unknown>).includeThoughts).toBe(true);
    });

    it("respects includeThoughts false", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-3-pro-high",
        tierThinkingLevel: "high",
        normalizedThinking: { includeThoughts: false },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      expect((genConfig.thinkingConfig as Record<string, unknown>).includeThoughts).toBe(false);
    });

    it("handles Gemini 2.5 without tierThinkingBudget or normalizedThinking.thinkingBudget", () => {
      const payload: RequestPayload = { contents: [] };
      applyGeminiTransforms(payload, {
        model: "gemini-2.5-pro",
        normalizedThinking: { includeThoughts: true },
      });
      const genConfig = payload.generationConfig as Record<string, unknown>;
      const thinkingConfig = genConfig.thinkingConfig as Record<string, unknown>;
      expect(thinkingConfig.includeThoughts).toBe(true);
      expect(thinkingConfig).not.toHaveProperty("thinkingBudget");
    });
  });
});
