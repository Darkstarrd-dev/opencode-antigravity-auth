import {
  ANTIGRAVITY_ENDPOINT_FALLBACKS,
  CODE_ASSIST_HEADERS,
  SEARCH_MODEL,
  SEARCH_THINKING_BUDGET_DEEP,
  SEARCH_THINKING_BUDGET_FAST,
  SEARCH_TIMEOUT_MS,
} from "../constants";
import { createLogger } from "./logger";
import { generateRequestId, getSessionId } from "./request-helpers";

const log = createLogger("search");

interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

interface GroundingSupport {
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  groundingChunkIndices?: number[];
  confidenceScore?: number;
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

interface UrlMetadata {
  retrieved_url?: string;
  url_retrieval_status?: string;
}

interface UrlContextMetadata {
  url_metadata?: UrlMetadata[];
}

interface SearchResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
    groundingMetadata?: GroundingMetadata;
    urlContextMetadata?: UrlContextMetadata;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface AntigravitySearchResponse {
  response?: SearchResponse;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface SearchArgs {
  query: string;
  urls?: string[];
  thinking?: boolean;
}

export interface SearchResult {
  text: string;
  sources: Array<{ title: string; url: string }>;
  citations: Array<{ text: string; sourceTitle: string; sourceUrl: string }>;
  searchQueries: string[];
  urlsRetrieved: Array<{ url: string; status: string }>;
}

function formatSearchResult(result: SearchResult): string {
  const lines: string[] = [];

  lines.push("## Search Results\n");
  lines.push(result.text);
  lines.push("");

  if (result.citations.length > 0) {
    lines.push("### Citations");
    for (let i = 0; i < result.citations.length; i++) {
      const citation = result.citations[i]!;
      lines.push(`[${i + 1}] ${citation.text} — [${citation.sourceTitle}](${citation.sourceUrl})`);
    }
    lines.push("");
  }

  if (result.sources.length > 0) {
    lines.push("### Sources");
    for (const source of result.sources) {
      lines.push(`- [${source.title}](${source.url})`);
    }
    lines.push("");
  }

  if (result.urlsRetrieved.length > 0) {
    lines.push("### URLs Retrieved");
    for (const url of result.urlsRetrieved) {
      const status = url.status === "URL_RETRIEVAL_STATUS_SUCCESS" ? "✓" : "✗";
      lines.push(`- ${status} ${url.url}`);
    }
    lines.push("");
  }

  if (result.searchQueries.length > 0) {
    lines.push("### Search Queries Used");
    for (const q of result.searchQueries) {
      lines.push(`- "${q}"`);
    }
  }

  return lines.join("\n");
}

function parseSearchResponse(data: AntigravitySearchResponse): SearchResult {
  const result: SearchResult = {
    text: "",
    sources: [],
    citations: [],
    searchQueries: [],
    urlsRetrieved: [],
  };

  const response = data.response;
  if (!response || !response.candidates || response.candidates.length === 0) {
    if (data.error) {
      result.text = `Error: ${data.error.message ?? "Unknown error"}`;
    } else if (response?.error) {
      result.text = `Error: ${response.error.message ?? "Unknown error"}`;
    }
    return result;
  }

  const candidate = response.candidates[0];
  if (!candidate) {
    return result;
  }

  if (candidate.content?.parts) {
    result.text = candidate.content.parts
      .map((p: { text?: string }) => p.text ?? "")
      .filter(Boolean)
      .join("\n");
  }

  if (candidate.groundingMetadata) {
    const gm = candidate.groundingMetadata;

    if (gm.webSearchQueries) {
      result.searchQueries = gm.webSearchQueries;
    }

    const chunks = gm.groundingChunks || [];
    if (chunks.length > 0) {
      for (const chunk of chunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          result.sources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
          });
        }
      }
    }

    // Parse citations from groundingSupports
    if (gm.groundingSupports && gm.groundingSupports.length > 0) {
      for (const support of gm.groundingSupports) {
        if (support.segment?.text && support.groundingChunkIndices && support.groundingChunkIndices.length > 0) {
          const firstIndex = support.groundingChunkIndices[0]!;
          const chunk = chunks[firstIndex];
          if (chunk?.web?.uri && chunk?.web?.title) {
            result.citations.push({
              text: support.segment.text,
              sourceTitle: chunk.web.title,
              sourceUrl: chunk.web.uri,
            });
          }
        }
      }
    }
  }

  if (candidate.urlContextMetadata?.url_metadata) {
    for (const meta of candidate.urlContextMetadata.url_metadata) {
      if (meta.retrieved_url) {
        result.urlsRetrieved.push({
          url: meta.retrieved_url,
          status: meta.url_retrieval_status ?? "UNKNOWN",
        });
      }
    }
  }

  return result;
}

const SEARCH_SYSTEM_INSTRUCTION = `You are an expert web search assistant with access to Google Search and URL analysis tools.

Your capabilities:
- Use google_search to find real-time information from the web
- Use url_context to fetch and analyze content from specific URLs when provided

Guidelines:
- Always provide accurate, well-sourced information
- Cite your sources when presenting facts
- If analyzing URLs, extract the most relevant information
- Be concise but comprehensive in your responses
- If information is uncertain or conflicting, acknowledge it
- Focus on answering the user's question directly`;

export async function executeSearch(
  args: SearchArgs,
  accessToken: string,
  projectId: string,
  abortSignal?: AbortSignal,
): Promise<string> {
  const { query, urls, thinking = true } = args;

  let prompt = query;
  if (urls && urls.length > 0) {
    const urlList = urls.join("\n");
    prompt = `${query}\n\nURLs to analyze:\n${urlList}`;
  }

  const tools: Array<Record<string, unknown>> = [];
  tools.push({ googleSearch: {} });
  if (urls && urls.length > 0) {
    tools.push({ urlContext: {} });
  }

  const thinkingBudget = thinking 
    ? Math.min(SEARCH_THINKING_BUDGET_DEEP, 24576) 
    : SEARCH_THINKING_BUDGET_FAST;

  const requestPayload = {
    systemInstruction: {
      parts: [{ text: SEARCH_SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    tools,
    generationConfig: {
      candidateCount: 1,
      thinkingConfig: {
        thinkingBudget,
        includeThoughts: false,
      },
    },
  };

  const wrappedBody = {
    project: projectId,
    model: SEARCH_MODEL,
    userAgent: "antigravity",
    requestId: generateRequestId(),
    requestType: "web_search",
    request: {
      ...requestPayload,
      sessionId: getSessionId(),
    },
  };

  let lastError: string | null = null;

  // Try all endpoints in fallback order (daily-non-sandbox → prod → daily → autopush)
  for (const endpoint of ANTIGRAVITY_ENDPOINT_FALLBACKS) {
    const url = `${endpoint}/v1internal:generateContent`;

    try {
      log.debug("Attempting search", { endpoint, url, query });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...CODE_ASSIST_HEADERS,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wrappedBody),
        signal: abortSignal ?? AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.debug("Search endpoint failed", { endpoint, status: response.status, error: errorText });
        lastError = `HTTP ${response.status}: ${errorText}`;
        
        // If it's a 403 (License), 404, 429, or 5xx, try the next endpoint
        if (response.status === 403 || response.status === 404 || response.status === 429 || response.status >= 500) {
          continue;
        }

        // For other errors, stop
        break;
      }

      const data = (await response.json()) as AntigravitySearchResponse;
      log.debug("Search response received", { endpoint, hasResponse: !!data.response });

      const result = parseSearchResponse(data);
      return formatSearchResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.debug("Search fetch error", { endpoint, error: message });
      lastError = message;
      
      if (message.includes("aborted") || message.includes("Aborted")) {
        return "## Search Error\n\nSearch execution was cancelled.";
      }
      
      // Try next endpoint
      continue;
    }
  }

  // All endpoints failed - provide fallback guidance
  return `## Search Tool Unavailable

Direct search tool failed after trying all endpoints.

**Fallback Option**: The model can still access web information through its built-in Google Search Retrieval (Grounding) capability. This is automatically enabled when \`web_search.default_mode\` is set to \`auto\` in your configuration.

**To enable:**
1. Edit \`.opencode/antigravity.json\`
2. Add:
   \`\`\`json
   {
     "web_search": {
       "default_mode": "auto",
       "grounding_threshold": 0.3
     }
   }
   \`\`\`
3. Restart OpenCode

**Last Error**: ${lastError}

**Alternative**: Ask the model to search directly (it may use grounding automatically if enabled).`;
}
