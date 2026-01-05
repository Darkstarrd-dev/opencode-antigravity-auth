import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseAspectRatio,
  buildImageRequest,
  parseImageResponse,
  executeImageGeneration,
} from "./image";
import {
  IMAGE_MODEL,
  SAFETY_SETTINGS_OFF,
} from "../constants";

// Create a unique temp directory for tests
const TEST_DIR = join(tmpdir(), `image-test-${Date.now()}`);

describe("parseAspectRatio", () => {
  it("returns default 1:1 for undefined input", () => {
    expect(parseAspectRatio(undefined)).toBe("1:1");
  });

  it("returns default 1:1 for empty string", () => {
    expect(parseAspectRatio("")).toBe("1:1");
  });

  it("parses standard format 1:1", () => {
    expect(parseAspectRatio("1:1")).toBe("1:1");
  });

  it("parses standard format 16:9", () => {
    expect(parseAspectRatio("16:9")).toBe("16:9");
  });

  it("parses standard format 9:16", () => {
    expect(parseAspectRatio("9:16")).toBe("9:16");
  });

  it("parses standard format 4:3", () => {
    expect(parseAspectRatio("4:3")).toBe("4:3");
  });

  it("parses standard format 3:4", () => {
    expect(parseAspectRatio("3:4")).toBe("3:4");
  });

  it("parses standard format 21:9", () => {
    expect(parseAspectRatio("21:9")).toBe("21:9");
  });

  it("parses alias 'square' to 1:1", () => {
    expect(parseAspectRatio("square")).toBe("1:1");
  });

  it("parses alias 'landscape' to 16:9", () => {
    expect(parseAspectRatio("landscape")).toBe("16:9");
  });

  it("parses alias 'portrait' to 9:16", () => {
    expect(parseAspectRatio("portrait")).toBe("9:16");
  });

  it("parses alias 'wide' to 21:9", () => {
    expect(parseAspectRatio("wide")).toBe("21:9");
  });

  it("handles case-insensitive input for aliases", () => {
    expect(parseAspectRatio("SQUARE")).toBe("1:1");
    expect(parseAspectRatio("Landscape")).toBe("16:9");
    expect(parseAspectRatio("PORTRAIT")).toBe("9:16");
  });

  it("returns default 1:1 for unknown aspect ratio", () => {
    expect(parseAspectRatio("unknown")).toBe("1:1");
    expect(parseAspectRatio("2:1")).toBe("1:1");
    expect(parseAspectRatio("invalid")).toBe("1:1");
  });

  it("trims whitespace", () => {
    expect(parseAspectRatio("  16:9  ")).toBe("16:9");
    expect(parseAspectRatio(" landscape ")).toBe("16:9");
  });
});

describe("buildImageRequest", () => {
  it("builds basic request with default parameters", () => {
    const request = buildImageRequest("A beautiful sunset", "1:1", "standard");

    expect(request).toEqual({
      contents: [
        {
          role: "user",
          parts: [{ text: "A beautiful sunset" }],
        },
      ],
      generationConfig: {
        candidateCount: 1,
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
      safetySettings: SAFETY_SETTINGS_OFF,
    });
  });

  it("builds request with 16:9 aspect ratio", () => {
    const request = buildImageRequest("A landscape photo", "16:9", "standard");

    expect(request.generationConfig).toEqual({
      candidateCount: 1,
      imageConfig: {
        aspectRatio: "16:9",
      },
    });
  });

  it("builds request with HD quality (4K)", () => {
    const request = buildImageRequest("A high quality image", "1:1", "hd");

    expect(request.generationConfig).toEqual({
      candidateCount: 1,
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "4K",
      },
    });
  });

  it("includes all safety settings as OFF", () => {
    const request = buildImageRequest("test", "1:1", "standard");

    expect(request.safetySettings).toEqual([
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
    ]);
  });

  it("does NOT include tools, systemInstruction, or thinkingConfig", () => {
    const request = buildImageRequest("test", "1:1", "standard");

    expect(request).not.toHaveProperty("tools");
    expect(request).not.toHaveProperty("systemInstruction");
    expect(request).not.toHaveProperty("thinkingConfig");
  });
});

describe("parseImageResponse", () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("saves successful image response to file", async () => {
    // Small valid PNG (1x1 transparent pixel)
    const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    const response = {
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: base64Data,
                  },
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
      },
    };

    const payload = { prompt: "test" };
    const result = await parseImageResponse(response, TEST_DIR, payload);
    
    expect(result).toContain("Image generated and saved");
    expect(result).toContain(".png");
    expect(result).toContain(".webp");
    
    // Check list.md was created
    const listPath = join(TEST_DIR, "imgs", "list.md");
    expect(existsSync(listPath)).toBe(true);
  });

  it("returns error for API error response", async () => {
    const response = {
      error: {
        code: 400,
        message: "Invalid prompt",
        status: "INVALID_ARGUMENT",
      },
    };

    const payload = { prompt: "test" };
    const result = await parseImageResponse(response, TEST_DIR, payload);
    expect(result).toContain("Error:");
    expect(result).toContain("Invalid prompt");
  });

  it("returns error for empty candidates", async () => {
    const response = {
      response: {
        candidates: [],
      },
    };

    const payload = { prompt: "test" };
    const result = await parseImageResponse(response, TEST_DIR, payload);
    expect(result).toContain("Error:");
    expect(result).toContain("No image was generated");
  });

  it("returns error for missing response", async () => {
    const response = {};

    const payload = { prompt: "test" };
    const result = await parseImageResponse(response, TEST_DIR, payload);
    expect(result).toContain("Error:");
  });

  it("returns error for SAFETY finish reason", async () => {
    const response = {
      response: {
        candidates: [
          {
            finishReason: "SAFETY",
            content: {
              parts: [],
            },
          },
        ],
      },
    };

    const payload = { prompt: "test" };
    const result = await parseImageResponse(response, TEST_DIR, payload);
    expect(result).toContain("Error:");
    expect(result).toContain("safety");
  });
});

describe("executeImageGeneration", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    global.fetch = originalFetch;
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("returns error for empty prompt", async () => {
    const result = await executeImageGeneration(
      { prompt: "" },
      "token",
      "project",
      TEST_DIR
    );
    expect(result).toContain("Error:");
    expect(result).toContain("provide a description");
  });

  it("returns error for whitespace-only prompt", async () => {
    const result = await executeImageGeneration(
      { prompt: "   " },
      "token",
      "project",
      TEST_DIR
    );
    expect(result).toContain("Error:");
  });

  it("makes correct API request", async () => {
    // Small valid PNG
    const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: base64Data,
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    });

    await executeImageGeneration(
      { prompt: "A cat", aspect_ratio: "16:9", quality: "hd" },
      "test-token",
      "test-project",
      TEST_DIR
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toContain("v1internal:generateContent");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(options.body);
    expect(body.project).toBe("test-project");
    expect(body.model).toBe(IMAGE_MODEL);
    expect(body.requestType).toBe("image_gen");
    expect(body.request.contents[0].parts[0].text).toBe("A cat");
    expect(body.request.generationConfig.imageConfig.aspectRatio).toBe("16:9");
    expect(body.request.generationConfig.imageConfig.imageSize).toBe("4K");
  });

  it("returns success with file paths", async () => {
    const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: base64Data,
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    });

    const result = await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    expect(result).toContain("Image generated and saved");
    expect(result).toContain(".png");
    expect(result).toContain(".webp");
  });

  it("handles 429 rate limit error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    });

    const result = await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    expect(result).toContain("Error:");
    expect(result).toContain("Rate limited");
  });

  it("handles 400 bad request with error message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: { message: "Invalid image prompt" },
        }),
    });

    const result = await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    expect(result).toContain("Error:");
    expect(result).toContain("Invalid image prompt");
  });

  it("handles 403 access denied", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const result = await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    expect(result).toContain("Error:");
    expect(result).toContain("Access denied");
  });

  it("handles 500 server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal server error",
    });

    const result = await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    expect(result).toContain("Error:");
    expect(result).toContain("Server error");
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    expect(result).toContain("Error:");
    expect(result).toContain("Network failure");
  });

  it("logs failure to list.md on error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Server error",
    });

    await executeImageGeneration(
      { prompt: "A cat" },
      "token",
      "project",
      TEST_DIR
    );

    // Check list.md was created with failure entry
    const listPath = join(TEST_DIR, "imgs", "list.md");
    expect(existsSync(listPath)).toBe(true);
    
    const content = readFileSync(listPath, "utf-8");
    expect(content).toContain("[FAILED]");
    expect(content).toContain("Server error");
  });
});
