import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  ANTIGRAVITY_ENDPOINT_FALLBACKS,
  ANTIGRAVITY_HEADERS,
  ASPECT_RATIOS,
  IMAGE_MODEL,
  IMAGE_MODEL_PREVIEW,
  IMAGE_TIMEOUT_MS,
  SAFETY_SETTINGS_OFF,
} from "../constants";
import { createLogger } from "./logger";
import { generateRequestId } from "./request-helpers";

const log = createLogger("image");

// Track the last successfully used endpoint to prioritize it in future requests
type AntigravityEndpoint = typeof ANTIGRAVITY_ENDPOINT_FALLBACKS[number];
let _preferredEndpoint: AntigravityEndpoint | null = null;

/**
 * Arguments for image generation.
 */
export interface ImageGenerationArgs {
  /** Detailed description of the image to generate */
  prompt: string;
  /** Aspect ratio of the image (default: "1:1") */
  aspect_ratio?: string;
  /** Image quality: "standard" or "hd" (4K resolution) */
  quality?: string;
  /** Optional paths to reference images for image-to-image generation */
  imagePaths?: string[];
}

/**
 * Antigravity API response format for image generation.
 */
interface AntigravityImageResponse {
  response?: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            mimeType: string;
            data: string;
          };
          text?: string;
        }>;
      };
      finishReason?: string;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Result of saving an image to disk.
 */
interface ImageSaveResult {
  success: boolean;
  originalPath?: string;
  webpPath?: string;
  error?: string;
}

/**
 * Generates a timestamp string in YYYYMMDDHHMMSS format.
 */
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Ensures the imgs directory exists.
 */
function ensureImgsDirectory(workingDirectory: string): string {
  const imgsDir = join(workingDirectory, "imgs");
  if (!existsSync(imgsDir)) {
    mkdirSync(imgsDir, { recursive: true });
  }
  return imgsDir;
}

/**
 * Appends an entry to list.md in the imgs directory.
 */
function appendToListMd(
  imgsDir: string,
  filename: string,
  payload: Record<string, unknown>,
  success: boolean,
  errorMessage?: string
): void {
  const listPath = join(imgsDir, "list.md");
  const timestamp = new Date().toISOString();
  
  let entry: string;
  if (success) {
    entry = `
---

## ${filename}

**Time:** ${timestamp}

**Request Payload:**
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

`;
  } else {
    entry = `
---

## [FAILED] ${timestamp}

**Request Payload:**
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

**Error:**
\`\`\`
${errorMessage ?? "Unknown error"}
\`\`\`

`;
  }

  appendFileSync(listPath, entry, "utf-8");
}

/**
 * Saves base64 image data to file and converts to webp.
 */
async function saveImageToFile(
  base64Data: string,
  mimeType: string,
  workingDirectory: string,
  payload: Record<string, unknown>
): Promise<ImageSaveResult> {
  try {
    const imgsDir = ensureImgsDirectory(workingDirectory);
    const timestamp = generateTimestamp();
    
    // Determine file extension from mimeType
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const filename = `${timestamp}.${ext}`;
    const originalPath = join(imgsDir, filename);

    // Decode base64 and write original file
    const buffer = Buffer.from(base64Data, "base64");
    writeFileSync(originalPath, buffer);
    log.debug("Original image saved", { path: originalPath });

    // Convert to webp with 75% quality
    const webpFilename = `${timestamp}.webp`;
    const webpPath = join(imgsDir, webpFilename);
    
    await sharp(buffer)
      .webp({ quality: 75 })
      .toFile(webpPath);
    log.debug("WebP image saved", { path: webpPath });

    // Append success entry to list.md
    appendToListMd(imgsDir, filename, payload, true);

    return { success: true, originalPath, webpPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.debug("Failed to save image", { error: message });
    
    // Try to append failure to list.md
    try {
      const imgsDir = ensureImgsDirectory(workingDirectory);
      appendToListMd(imgsDir, "", payload, false, message);
    } catch {
      // Ignore if we can't write to list.md
    }
    
    return { success: false, error: message };
  }
}

/**
 * Parses SSE response and extracts image data.
 * Ported from opencode-antigravity-img for reliability.
 */
function parseSSEResponse(text: string): { success: boolean; imageData?: string; mimeType?: string; error?: string } {
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    const jsonStr = line.slice(6);
    if (jsonStr === "[DONE]") continue;

    try {
      const data = JSON.parse(jsonStr) as AntigravityImageResponse;

      // Check for error in data
      if (data.error) {
        return {
          success: false,
          error: `${data.error.code}: ${data.error.message}`,
        };
      }

      // Look for image in response
      const candidates = data.response?.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
            return {
              success: true,
              imageData: part.inlineData.data,
              mimeType: part.inlineData.mimeType,
            };
          }
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return { success: false, error: "No image in response" };
}

/**
 * Parses and normalizes the aspect ratio parameter.
 * Supports standard formats (1:1, 16:9, etc.) and aliases (square, landscape, portrait).
 *
 * @param aspectRatio - User-provided aspect ratio string
 * @returns Normalized aspect ratio string (default: "1:1")
 */
export function parseAspectRatio(aspectRatio?: string): string {
  if (!aspectRatio) {
    return "1:1";
  }

  const normalized = aspectRatio.toLowerCase().trim();

  // Check direct mapping
  if (ASPECT_RATIOS[normalized]) {
    return ASPECT_RATIOS[normalized];
  }

  // Check case-insensitive match for standard formats
  for (const [key, value] of Object.entries(ASPECT_RATIOS)) {
    if (key.toLowerCase() === normalized) {
      return value as string;
    }
  }

  log.debug("Unknown aspect ratio, using default", { aspectRatio, default: "1:1" });
  return "1:1";
}

/**
 * Builds the request payload for image generation.
 * Note: Image generation requests must NOT include tools, systemInstruction, or thinkingConfig.
 *
 * @param prompt - Image description prompt
 * @param aspectRatio - Normalized aspect ratio
 * @param quality - Image quality ("standard" or "hd")
 * @param images - Optional list of base64 encoded images with mime types
 * @returns Request payload object
 */
export function buildImageRequest(
  prompt: string,
  aspectRatio: string,
  quality: string,
  images: Array<{ data: string; mimeType: string }> = []
): Record<string, unknown> {
  const imageConfig: Record<string, string> = {
    aspectRatio,
  };

  // Add 4K resolution for HD quality
  if (quality === "hd") {
    imageConfig.imageSize = "4K";
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add images first
  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    });
  }

  // Add prompt
  parts.push({ text: prompt });

  return {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      candidateCount: 1,
      imageConfig,
    },
    safetySettings: SAFETY_SETTINGS_OFF,
  };
}

/**
 * Parses the image generation response, saves to file, and returns result.
 *
 * @param data - Antigravity API response
 * @param workingDirectory - Working directory to save images
 * @param requestPayload - Original request payload for logging
 * @returns Success message with file path or error message
 */
export async function parseImageResponse(
  data: AntigravityImageResponse,
  workingDirectory: string,
  requestPayload: Record<string, unknown>
): Promise<string> {
  // Check for API errors
  if (data.error) {
    const errorMessage = data.error.message ?? "Unknown error";
    log.debug("Image generation API error", { error: data.error });
    
    // Log failure to list.md
    try {
      const imgsDir = ensureImgsDirectory(workingDirectory);
      appendToListMd(imgsDir, "", requestPayload, false, errorMessage);
    } catch {
      // Ignore
    }
    
    return `Error: Image generation failed - ${errorMessage}`;
  }

  const response = data.response;
  if (!response || !response.candidates || response.candidates.length === 0) {
    log.debug("No candidates in response");
    
    try {
      const imgsDir = ensureImgsDirectory(workingDirectory);
      appendToListMd(imgsDir, "", requestPayload, false, "No candidates in response");
    } catch {
      // Ignore
    }
    
    return "Error: No image was generated. Please try a different prompt.";
  }

  const candidate = response.candidates[0];
  if (!candidate) {
    return "Error: No image was generated. Please try a different prompt.";
  }

  // Check for finish reason issues
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    log.debug("Non-STOP finish reason", { finishReason: candidate.finishReason });
    
    let errorMsg = "";
    if (candidate.finishReason === "SAFETY") {
      errorMsg = "Image generation was blocked due to safety filters.";
    } else if (candidate.finishReason === "RECITATION") {
      errorMsg = "Image generation was blocked due to content policy.";
    } else {
      errorMsg = `Unexpected finish reason: ${candidate.finishReason}`;
    }
    
    try {
      const imgsDir = ensureImgsDirectory(workingDirectory);
      appendToListMd(imgsDir, "", requestPayload, false, errorMsg);
    } catch {
      // Ignore
    }
    
    return `Error: ${errorMsg} Please try a different prompt.`;
  }

  const parts = candidate.content?.parts;
  if (!parts || parts.length === 0) {
    return "Error: Invalid response format. Please try again.";
  }

  // Find the image part (inlineData)
  for (const part of parts) {
    if (part.inlineData) {
      const { mimeType, data: base64Data } = part.inlineData;
      log.debug("Image generated successfully", { mimeType, dataLength: base64Data.length });

      // Save to file
      const saveResult = await saveImageToFile(
        base64Data,
        mimeType,
        workingDirectory,
        requestPayload
      );

      if (saveResult.success && saveResult.originalPath) {
        const ext = mimeType === "image/png" ? "png" : "jpg";
        return `Image generated and saved:\n- Original: ${saveResult.originalPath}\n- WebP (75%): ${saveResult.webpPath}\n\nFormat: ${ext.toUpperCase()}, Size: ${Math.round(base64Data.length * 0.75 / 1024)} KB (approx)`;
      } else {
        // Fallback: return base64 if save failed
        log.debug("Failed to save, returning base64", { error: saveResult.error });
        return `![Generated Image](data:${mimeType};base64,${base64Data})\n\n(Note: Failed to save to file: ${saveResult.error})`;
      }
    }
  }

  // No image found, check for text response (error message from model)
  for (const part of parts) {
    if (part.text) {
      try {
        const imgsDir = ensureImgsDirectory(workingDirectory);
        appendToListMd(imgsDir, "", requestPayload, false, `Model returned text: ${part.text}`);
      } catch {
        // Ignore
      }
      return `Error: Model returned text instead of image: ${part.text}`;
    }
  }

  return "Error: No image data found in response. Please try again.";
}

/**
 * Executes image generation using the Antigravity API.
 *
 * @param args - Image generation arguments
 * @param accessToken - OAuth access token
 * @param projectId - Project ID for the request
 * @param workingDirectory - Working directory to save images
 * @param abortSignal - Optional abort signal for cancellation
 * @returns Success message with file path or error message
 */
export async function executeImageGeneration(
  args: ImageGenerationArgs,
  accessToken: string,
  projectId: string,
  workingDirectory: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const { prompt, aspect_ratio, quality = "standard", imagePaths } = args;

  if (!prompt || prompt.trim().length === 0) {
    return "Error: Please provide a description of the image you want to generate.";
  }

  // Parse and normalize parameters
  const aspectRatio = parseAspectRatio(aspect_ratio);
  const normalizedQuality = quality.toLowerCase() === "hd" ? "hd" : "standard";

  // Process reference images if provided
  const processedImages: Array<{ data: string; mimeType: string }> = [];
  if (imagePaths && imagePaths.length > 0) {
    if (imagePaths.length > 10) {
      return "Error: Maximum of 10 reference images allowed.";
    }

    for (const path of imagePaths) {
      try {
        if (existsSync(path)) {
          const buffer = readFileSync(path);
          const ext = path.split(".").pop()?.toLowerCase();
          let mimeType = "image/jpeg";
          if (ext === "png") mimeType = "image/png";
          if (ext === "webp") mimeType = "image/webp";
          
          processedImages.push({
            data: buffer.toString("base64"),
            mimeType,
          });
        } else {
          log.warn(`Reference image not found: ${path}`);
        }
      } catch (e) {
        log.warn(`Failed to read reference image: ${path}`, { error: String(e) });
      }
    }
  }

  log.debug("Executing image generation", {
    promptLength: prompt.length,
    aspectRatio,
    quality: normalizedQuality,
    workingDirectory,
    referenceImageCount: processedImages.length,
  });

  // Build request payload
  const requestPayload = buildImageRequest(prompt, aspectRatio, normalizedQuality, processedImages);

  // Wrap in Antigravity format using 'agent' request type to avoid 403 License errors
  const wrappedBody = {
    project: projectId,
    model: IMAGE_MODEL,
    userAgent: "antigravity",
    requestId: generateRequestId(),
    requestType: "agent",
    request: {
      ...requestPayload,
      session_id: `sess-${randomUUID()}`,
      generationConfig: {
        ...(requestPayload.generationConfig as Record<string, unknown>),
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
  };

  let lastError: string | null = null;

  // Prioritize the preferred endpoint if set
  const endpointsToTry: AntigravityEndpoint[] = [...ANTIGRAVITY_ENDPOINT_FALLBACKS];
  if (_preferredEndpoint) {
    const idx = endpointsToTry.indexOf(_preferredEndpoint);
    if (idx > 0) {
      // Move preferred to front
      endpointsToTry.splice(idx, 1);
      endpointsToTry.unshift(_preferredEndpoint);
      log.debug("Using preferred endpoint first", { endpoint: _preferredEndpoint });
    }
  }

  // Try all endpoints in fallback order
  for (const endpoint of endpointsToTry) {
    const url = `${endpoint}/v1internal:streamGenerateContent?alt=sse`;
    
    try {
      log.debug("Attempting image generation", { endpoint, url });
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...ANTIGRAVITY_HEADERS,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wrappedBody),
        signal: abortSignal ?? AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });

      if (!response.ok) {
        // If preferred endpoint fails, clear it so we don't stick to a bad one
        if (endpoint === _preferredEndpoint) {
          _preferredEndpoint = null;
        }

        const errorText = await response.text();
        log.debug("Endpoint failed", {
          endpoint,
          status: response.status,
          error: errorText,
        });

        lastError = `HTTP ${response.status}: ${errorText}`;

        // If it's a 403 (License), 404, 429, or 5xx, try the next endpoint
        if (response.status === 403 || response.status === 404 || response.status === 429 || response.status >= 500) {
          continue;
        }

        // For other errors (like 400 Bad Request), stop and return
        break;
      }

      // Parse SSE response
      const text = await response.text();
      const sseResult = parseSSEResponse(text);

      if (!sseResult.success || !sseResult.imageData) {
        lastError = sseResult.error || "No image data in SSE response";
        log.debug("SSE parsing failed", { endpoint, error: lastError });
        continue;
      }

      log.debug("Image generated successfully via SSE", { endpoint });

      // Success! Update preferred endpoint for next time
      if (_preferredEndpoint !== endpoint) {
        log.debug("Updating preferred endpoint", { old: _preferredEndpoint, new: endpoint });
        _preferredEndpoint = endpoint;
      }

      // Convert sseResult to the format parseImageResponse expects or just save it here
      // To keep it clean, let's reconstruct a data object compatible with parseImageResponse
      const data: AntigravityImageResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: sseResult.mimeType || "image/png",
                      data: sseResult.imageData,
                    },
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
        },
      };

      return parseImageResponse(data, workingDirectory, requestPayload);
    } catch (error) {
      // If preferred endpoint errors, clear it
      if (endpoint === _preferredEndpoint) {
        _preferredEndpoint = null;
      }

      const message = error instanceof Error ? error.message : String(error);
      log.debug("Fetch error", { endpoint, error: message });
      lastError = message;
      
      if (message.includes("aborted") || message.includes("Aborted")) {
        return "Error: Image generation was cancelled.";
      }
      
      // Try next endpoint on network errors
      continue;
    }
  }

  // If we get here, all endpoints failed
  const errorMessage = lastError ?? "All endpoints failed";
  
  // Check if this is a 403 error and provide fallback guidance
  if (lastError && lastError.includes("403")) {
    log.debug("Primary image generation failed with 403, attempting fallback");
    
    // Simplified fallback: prompt user to use model name trigger
    return `**Image Generation Fallback**

Primary tool failed with 403 License error. Please try using the model directly:

1. Switch to model: \`gemini-3-pro-image\`
2. Send your prompt: "${prompt}"
3. Aspect ratio will use default (1:1) or set \`OPENCODE_IMAGE_ASPECT_RATIO\` environment variable

**Technical Details:**
- Primary endpoint: Fork implementation (tool-based)
- Fallback: Source implementation (model-based)
- Last error: ${lastError}`;
  }
  
  // Log final failure
  try {
    const imgsDir = ensureImgsDirectory(workingDirectory);
    appendToListMd(imgsDir, "", requestPayload, false, errorMessage);
  } catch {}

  return `Error: Image generation failed after trying all endpoints. Last error: ${errorMessage}`;
}
