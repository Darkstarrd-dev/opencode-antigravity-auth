import { generateRequestId } from "./request-helpers";
import { createLogger } from "./logger";
import { CODE_ASSIST_HEADERS, SEARCH_MODEL } from "../constants";

const log = createLogger("count-tokens");

export interface CountTokensArgs {
  text: string;
  model?: string;
}

export interface CountTokensResponse {
  totalTokens: number;
  billableTokens?: number;
  cachedTokens?: number;
}

export async function executeCountTokens(
  args: CountTokensArgs,
  accessToken: string,
  projectId: string,
  endpoint: string,
): Promise<string> {
  const { text, model = SEARCH_MODEL } = args;

  const requestPayload = {
    contents: [
      {
        role: "user",
        parts: [{ text }],
      },
    ],
  };

  const wrappedBody = {
    project: projectId,
    model: model,
    requestId: generateRequestId(),
    request: {
      ...requestPayload,
    },
  };

  const url = `${endpoint}/v1internal:countTokens`;

  try {
    log.debug("Attempting count tokens", { endpoint, url, model });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...CODE_ASSIST_HEADERS,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wrappedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.debug("Count tokens failed", { status: response.status, error: errorText });
      return `Error counting tokens: ${errorText}`;
    }

    const data = (await response.json()) as any;
    const totalTokens = data.totalTokens ?? 0;
    
    let result = `### Token Count\n\n- **Total Tokens**: ${totalTokens}`;
    if (data.billableTokens !== undefined) {
      result += `\n- **Billable Tokens**: ${data.billableTokens}`;
    }
    if (data.cachedTokens !== undefined) {
      result += `\n- **Cached Tokens**: ${data.cachedTokens}`;
    }
    
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Count tokens error", { error: message });
    return `Error: ${message}`;
  }
}
